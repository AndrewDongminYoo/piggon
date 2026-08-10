function assertTimestamp(seconds: number): void {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw new Error("Video timestamp must be a non-negative integer");
  }
}

export function buildYouTubeTimestampUrl(
  videoId: string,
  startSeconds: number | null,
): string {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", videoId);

  if (startSeconds !== null) {
    assertTimestamp(startSeconds);
    url.searchParams.set("t", `${startSeconds}s`);
  }

  return url.toString();
}

export function formatVideoTimestamp(seconds: number): string {
  assertTimestamp(seconds);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
