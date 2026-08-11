import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

// The module under test is server-only; Vitest resolves the guard's throwing
// export. Stubbing it exercises the real decoder rather than a mock of it.
vi.mock("server-only", () => ({}));

import { decodesAsVisitImage } from "./image-decode-server";

const solid = () =>
  sharp({
    create: {
      background: { b: 40, g: 120, r: 220 },
      channels: 3,
      height: 24,
      width: 24,
    },
  });

let jpeg: Uint8Array;
let png: Uint8Array;
let webp: Uint8Array;

beforeAll(async () => {
  jpeg = new Uint8Array(await solid().jpeg().toBuffer());
  png = new Uint8Array(await solid().png().toBuffer());
  webp = new Uint8Array(await solid().webp().toBuffer());
});

describe("decodesAsVisitImage", () => {
  it("accepts real images of each supported format", async () => {
    await expect(decodesAsVisitImage(jpeg, "image/jpeg")).resolves.toBe(true);
    await expect(decodesAsVisitImage(png, "image/png")).resolves.toBe(true);
    await expect(decodesAsVisitImage(webp, "image/webp")).resolves.toBe(true);
  });

  // The two payloads the reviewer named. Both satisfy every structural rule the
  // signature check can express, which is exactly why decoding is the check that
  // the validation record certifies.
  it("rejects a structurally valid JPEG carrying no frame", async () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);

    await expect(decodesAsVisitImage(bytes, "image/jpeg")).resolves.toBe(false);
  });

  it("rejects a WebP container with no image chunk", async () => {
    const bytes = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);

    await expect(decodesAsVisitImage(bytes, "image/webp")).resolves.toBe(false);
  });

  it("rejects a truncated image whose header still parses", async () => {
    await expect(
      decodesAsVisitImage(png.subarray(0, png.length - 20), "image/png"),
    ).resolves.toBe(false);
  });

  it("rejects an image whose format is not the one claimed", async () => {
    await expect(decodesAsVisitImage(png, "image/jpeg")).resolves.toBe(false);
  });
});
