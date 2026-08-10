export const VISIT_EVIDENCE_BUCKET = "visit-evidence";
export const VISIT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export type VisitImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type VisitImageExtension = "jpg" | "png" | "webp";

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]+$/;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectImageMediaType(
  bytes: Uint8Array,
): VisitImageMediaType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
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
