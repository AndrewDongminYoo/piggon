import { beforeEach, describe, expect, it, vi } from "vitest";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const RESTAURANT_ID = "22222222-2222-2222-2222-222222222222";
const OWNED_PATH = `${USER_ID}/${RESTAURANT_ID}/photo.webp`;

const {
  cleanupStoredVisitPhoto,
  maybeSingle,
  reclaimStoredAbandonedVisitPhotos,
  requireUser,
  retryStoredVisitPhotoCleanup,
} = vi.hoisted(() => ({
  cleanupStoredVisitPhoto: vi.fn(),
  maybeSingle: vi.fn(),
  reclaimStoredAbandonedVisitPhotos: vi.fn(),
  requireUser: vi.fn(),
  retryStoredVisitPhotoCleanup: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./evidence-validation-server", () => ({
  readVisitEvidenceVersion: vi.fn(async () => "version"),
  recordValidatedVisitEvidence: vi.fn(async () => true),
}));
vi.mock("./image-decode-server", () => ({
  decodesAsVisitImage: vi.fn(async () => true),
}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("./photo-cleanup-server", () => ({
  cleanupStoredVisitPhoto,
  reclaimStoredAbandonedVisitPhotos,
  retryStoredVisitPhotoCleanup,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }),
    }),
  }),
}));

import {
  discardUploadedVisitPhoto,
  reclaimAbandonedVisitEvidence,
} from "./actions";

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

describe("discardUploadedVisitPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    cleanupStoredVisitPhoto.mockResolvedValue(true);
  });

  it("discards an upload no visit points at", async () => {
    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).toHaveBeenCalledWith(OWNED_PATH, USER_ID);
  });

  it("refuses a path outside the caller's own folder", async () => {
    await discardUploadedVisitPhoto(
      RESTAURANT_ID,
      `33333333-3333-3333-3333-333333333333/${RESTAURANT_ID}/photo.webp`,
    );

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });

  it("keeps a photo a saved visit still references", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "visit-id" }, error: null });

    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });

  it("keeps the photo when the ownership lookup fails", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "down" } });

    await discardUploadedVisitPhoto(RESTAURANT_ID, OWNED_PATH);

    expect(cleanupStoredVisitPhoto).not.toHaveBeenCalled();
  });
});
