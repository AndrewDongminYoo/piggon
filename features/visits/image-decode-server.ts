import "server-only";

import sharp from "sharp";

import type { VisitImageMediaType } from "./storage";

// Bounds a decompression bomb: a small file can declare an enormous canvas, and
// decoding it is what would allocate. 50MP is far above any phone photo.
const MAX_DECODED_PIXELS = 50_000_000;

const FORMAT_BY_MEDIA_TYPE: Record<VisitImageMediaType, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

// The signature and structure checks bound the shape of the bytes; they cannot
// establish that the bytes are an image. This decodes them. A header glued onto
// other data, a truncated frame, or a container with no image chunk all fail
// here even though they satisfy every structural rule.
//
// The decode is forced by resizing rather than by reading metadata, because
// metadata parses the header only — the exact thing already checked. The output
// is deliberately tiny so proving the source decodes costs bounded memory.
export async function decodesAsVisitImage(
  bytes: Uint8Array,
  expected: VisitImageMediaType,
): Promise<boolean> {
  try {
    const image = sharp(Buffer.from(bytes), {
      limitInputPixels: MAX_DECODED_PIXELS,
    });
    const { format, height, width } = await image.metadata();

    if (
      format !== FORMAT_BY_MEDIA_TYPE[expected] ||
      !width ||
      !height ||
      width < 1 ||
      height < 1
    ) {
      return false;
    }

    await image.resize({ fit: "inside", height: 32, width: 32 }).toBuffer();
    return true;
  } catch {
    return false;
  }
}
