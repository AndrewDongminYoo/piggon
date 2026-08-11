export const VISIT_EVIDENCE_BUCKET = "visit-evidence";
export const VISIT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export type VisitImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type VisitImageExtension = "jpg" | "png" | "webp";

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function endsWith(bytes: Uint8Array, signature: number[]): boolean {
  const offset = bytes.length - signature.length;
  return (
    offset >= 0 && signature.every((value, i) => bytes[offset + i] === value)
  );
}

function withoutTrailingZeros(bytes: Uint8Array): Uint8Array {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end -= 1;
  }

  return bytes.subarray(0, end);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] +
    bytes[offset + 1] * 256 +
    bytes[offset + 2] * 65536 +
    bytes[offset + 3] * 16777216
  );
}

// A prefix match only proves how the bytes start, so a valid header followed by
// anything at all used to pass. Each format is also checked for the structure
// that has to span the whole payload: its terminator, or a declared length that
// agrees with what was actually uploaded.
//
// This is not a decoder. It rejects a header glued onto arbitrary data, which is
// the reachable case; it does not prove the pixels decode. Doing that would mean
// taking on an image library, which is a bigger call than this check deserves.
export function detectImageMediaType(
  bytes: Uint8Array,
): VisitImageMediaType | null {
  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) &&
    // SOI ... EOI, with enough between them to hold a frame. Trailing zero
    // padding is tolerated because real encoders emit it; anything else after
    // EOI is not, since that is what a header glued onto other data looks like.
    bytes.length > 4 &&
    endsWith(withoutTrailingZeros(bytes), [0xff, 0xd9])
  ) {
    return "image/jpeg";
  }

  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    // First chunk must be IHDR, and the stream must close with IEND.
    startsWith(bytes.subarray(12), [0x49, 0x48, 0x44, 0x52]) &&
    endsWith(bytes, [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
  ) {
    return "image/png";
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 &&
    // RIFF declares its own size; it must match the bytes that arrived.
    bytes.length >= 12 &&
    readUint32LE(bytes, 4) === bytes.length - 8
  ) {
    return "image/webp";
  }

  return null;
}

export function extensionForMediaType(
  mediaType: VisitImageMediaType,
): VisitImageExtension {
  if (mediaType === "image/jpeg") {
    return "jpg";
  }

  return mediaType === "image/png" ? "png" : "webp";
}

export function createVisitPhotoPath(
  userId: string,
  restaurantId: string,
  extension: VisitImageExtension,
  fileId = crypto.randomUUID(),
): string {
  if (
    !SAFE_PATH_SEGMENT.test(userId) ||
    !SAFE_PATH_SEGMENT.test(restaurantId) ||
    !SAFE_PATH_SEGMENT.test(fileId)
  ) {
    throw new Error("Visit photo path contains an invalid segment");
  }

  return `${userId}/${restaurantId}/${fileId}.${extension}`;
}

export function isOwnedVisitPhotoPath(
  photoPath: string,
  userId: string,
  restaurantId: string,
): boolean {
  const [pathUserId, pathRestaurantId, fileName, extra] = photoPath.split("/");

  return (
    extra === undefined &&
    pathUserId === userId &&
    pathRestaurantId === restaurantId &&
    SAFE_PATH_SEGMENT.test(pathUserId) &&
    SAFE_PATH_SEGMENT.test(pathRestaurantId) &&
    /^[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/.test(fileName ?? "")
  );
}

export function pathMatchesMediaType(
  photoPath: string,
  mediaType: VisitImageMediaType,
): boolean {
  return photoPath.endsWith(`.${extensionForMediaType(mediaType)}`);
}
