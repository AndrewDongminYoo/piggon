import { describe, expect, it } from "vitest";

import { profileInputSchema, visitInputSchema } from "./schema";
import {
  createVisitPhotoPath,
  detectImageMediaType,
  isOwnedVisitPhotoPath,
} from "./storage";

const restaurantId = "11111111-1111-4111-8111-111111111111";

describe("visitInputSchema", () => {
  it("accepts one Instagram post as evidence", () => {
    expect(
      visitInputSchema.parse({
        evidenceType: "instagram",
        instagramUrl: "https://www.instagram.com/p/example/",
        photoPath: null,
        rating: 5,
        restaurantId,
        reviewBody: "다시 먹고 싶은 피자",
        visitedOn: "2026-08-10",
      }).evidenceType,
    ).toBe("instagram");
  });

  it("requires rating and review text together", () => {
    expect(() =>
      visitInputSchema.parse({
        evidenceType: "instagram",
        instagramUrl: "https://www.instagram.com/p/example/",
        photoPath: null,
        rating: 5,
        restaurantId,
        reviewBody: "",
        visitedOn: "2026-08-10",
      }),
    ).toThrow();
  });

  it("rejects a photo submission without a storage path", () => {
    expect(() =>
      visitInputSchema.parse({
        evidenceType: "photo",
        instagramUrl: null,
        photoPath: null,
        rating: null,
        restaurantId,
        reviewBody: null,
        visitedOn: "2026-08-10",
      }),
    ).toThrow();
  });
});

describe("profileInputSchema", () => {
  it("trims a public display name", () => {
    expect(profileInputSchema.parse({ displayName: "  피자러버  " })).toEqual({
      displayName: "피자러버",
    });
  });
});

describe("visit photo storage", () => {
  it("builds an owner-scoped photo path", () => {
    expect(
      createVisitPhotoPath("user-id", "restaurant-id", "webp", "file-id"),
    ).toBe("user-id/restaurant-id/file-id.webp");
  });

  it("rejects a path outside the owner and restaurant folders", () => {
    expect(
      isOwnedVisitPhotoPath(
        "other-user/restaurant-id/file-id.webp",
        "user-id",
        "restaurant-id",
      ),
    ).toBe(false);
  });

  it("detects supported images from file signatures", () => {
    expect(
      detectImageMediaType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(detectImageMediaType(Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(
      "image/jpeg",
    );
    expect(
      detectImageMediaType(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("rejects content without a supported signature", () => {
    expect(
      detectImageMediaType(Uint8Array.from([0x47, 0x49, 0x46])),
    ).toBeNull();
  });
});
