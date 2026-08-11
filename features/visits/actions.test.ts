import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RESTAURANT_ID = "22222222-2222-4222-8222-222222222222";
const OWNED_PATH = `${USER_ID}/${RESTAURANT_ID}/photo.webp`;

// Smallest byte sequence that satisfies the structural WebP check: RIFF header, a
// declared size that agrees with the payload, and the WEBP tag. Structurally
// valid and not an image — which is the whole point of the decode gate.
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

const {
  cleanupStoredVisitPhoto,
  decodesAsVisitImage,
  maybeSingle,
  readVisitEvidenceVersion,
  reclaimStoredAbandonedVisitPhotos,
  recordValidatedVisitEvidence,
  requireUser,
  retryStoredVisitPhotoCleanup,
} = vi.hoisted(() => ({
  cleanupStoredVisitPhoto: vi.fn(),
  decodesAsVisitImage: vi.fn(),
  maybeSingle: vi.fn(),
  readVisitEvidenceVersion: vi.fn(),
  reclaimStoredAbandonedVisitPhotos: vi.fn(),
  recordValidatedVisitEvidence: vi.fn(),
  requireUser: vi.fn(),
  retryStoredVisitPhotoCleanup: vi.fn(),
}));

// Reads and writes on the same table need different answers — upsertVisit reads
// the previous visit and then writes one — so the builder remembers whether a
// write verb was called before answering.
const reads: Record<string, unknown> = {};
const writes: Record<string, unknown> = {};
const download = vi.fn();

function createQuery(table: string) {
  let written = false;
  const answer = async () =>
    written
      ? (writes[table] ?? { data: null, error: null })
      : (reads[table] ?? { data: null, error: null });
  const chain: Record<string, unknown> = {
    delete: () => {
      written = true;
      return chain;
    },
    eq: () => chain,
    insert: () => {
      written = true;
      return chain;
    },
    is: () => chain,
    maybeSingle: table === "visits" ? answer : maybeSingle,
    select: () => chain,
    single: answer,
    update: () => {
      written = true;
      return chain;
    },
    upsert: () => {
      written = true;
      return chain;
    },
  };

  return chain;
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./evidence-validation-server", () => ({
  readVisitEvidenceVersion,
  recordValidatedVisitEvidence,
}));
vi.mock("./image-decode-server", () => ({ decodesAsVisitImage }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("./photo-cleanup-server", () => ({
  cleanupStoredVisitPhoto,
  reclaimStoredAbandonedVisitPhotos,
  retryStoredVisitPhotoCleanup,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => createQuery(table),
    storage: { from: () => ({ download }) },
  }),
}));

import {
  discardUploadedVisitPhoto,
  reclaimAbandonedVisitEvidence,
  upsertVisit,
} from "./actions";

function photoVisitForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const fields: Record<string, string> = {
    evidenceType: "photo",
    instagramUrl: "",
    photoPath: OWNED_PATH,
    rating: "",
    restaurantId: RESTAURANT_ID,
    reviewBody: "",
    visitVersion: "recorded-version",
    visitedOn: "2026-08-10",
    ...overrides,
  };
  Object.entries(fields).forEach(([key, value]) => formData.set(key, value));

  return formData;
}

const INITIAL = { message: "", status: "idle" as const };

describe("reclaimAbandonedVisitEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID });
  });

  // The pre-upload path exists to unblock a full evidence budget, so it has to
  // free everything holding budget. A failed delete sits in the retry queue and
  // is far too recent for the age-gated sweep, so sweeping alone left the upload
  // blocked until that object aged out.
  it("retries queued deletions as well as sweeping abandoned uploads", async () => {
    await reclaimAbandonedVisitEvidence();

    expect(retryStoredVisitPhotoCleanup).toHaveBeenCalledWith(USER_ID);
    expect(reclaimStoredAbandonedVisitPhotos).toHaveBeenCalledWith(
      USER_ID,
      null,
    );
  });
});

describe("upsertVisit photo evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID });
    readVisitEvidenceVersion.mockResolvedValue("recorded-version");
    recordValidatedVisitEvidence.mockResolvedValue(true);
    decodesAsVisitImage.mockResolvedValue(true);
    download.mockResolvedValue({ data: new Blob([WEBP_HEADER]), error: null });
    maybeSingle.mockResolvedValue({ data: { id: USER_ID }, error: null });
    reads.visits = {
      data: { id: "visit-id", photo_path: null, restaurant_id: RESTAURANT_ID },
      error: null,
    };
    writes.visits = {
      data: { id: "visit-id", photo_path: OWNED_PATH },
      error: null,
    };
    reads.restaurants = {
      data: { id: RESTAURANT_ID, slug: "marione" },
      error: null,
    };
  });

  // The certification is what the write policy trusts, so nothing may be
  // certified that the server could not decode.
  it("refuses to certify evidence that does not decode", async () => {
    decodesAsVisitImage.mockResolvedValue(false);

    const state = await upsertVisit(INITIAL, photoVisitForm());

    expect(state.status).toBe("error");
    expect(state.message).toContain("사진을 읽지 못했습니다");
    expect(recordValidatedVisitEvidence).not.toHaveBeenCalled();
  });

  it("certifies against the version pinned before the download", async () => {
    const state = await upsertVisit(INITIAL, photoVisitForm());

    expect(recordValidatedVisitEvidence).toHaveBeenCalledWith(
      OWNED_PATH,
      USER_ID,
      "recorded-version",
    );
    expect(state.status).toBe("success");
  });

  it("stops before decoding when the object cannot be read", async () => {
    readVisitEvidenceVersion.mockResolvedValue(null);

    const state = await upsertVisit(INITIAL, photoVisitForm());

    expect(state.status).toBe("error");
    expect(decodesAsVisitImage).not.toHaveBeenCalled();
    expect(recordValidatedVisitEvidence).not.toHaveBeenCalled();
  });

  it("refuses a path belonging to another account", async () => {
    const state = await upsertVisit(
      INITIAL,
      photoVisitForm({
        photoPath: `33333333-3333-4333-8333-333333333333/${RESTAURANT_ID}/photo.webp`,
      }),
    );

    expect(state.status).toBe("error");
    expect(recordValidatedVisitEvidence).not.toHaveBeenCalled();
  });

  it("refuses bytes whose signature does not match the extension", async () => {
    download.mockResolvedValue({
      data: new Blob([Uint8Array.from([1, 2, 3, 4])]),
      error: null,
    });

    const state = await upsertVisit(INITIAL, photoVisitForm());

    expect(state.status).toBe("error");
    expect(decodesAsVisitImage).not.toHaveBeenCalled();
    expect(recordValidatedVisitEvidence).not.toHaveBeenCalled();
  });
});

describe("discardUploadedVisitPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID });
    reads.visits = { data: null, error: null };
    cleanupStoredVisitPhoto.mockResolvedValue(true);
  });

  it("discards an upload no visit points at", async () => {
    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).toHaveBeenCalledWith(OWNED_PATH, USER_ID);
  });

  it("refuses a path outside the caller's own folder", async () => {
    await discardUploadedVisitPhoto(
      RESTAURANT_ID,
      `33333333-3333-4333-8333-333333333333/${RESTAURANT_ID}/photo.webp`,
    );

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });

  it("keeps a photo a saved visit still references", async () => {
    reads.visits = { data: { id: "visit-id" }, error: null };

    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });

  it("keeps the photo when the ownership lookup fails", async () => {
    reads.visits = { data: null, error: { message: "down" } };

    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });
});
