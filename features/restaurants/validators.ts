const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_POST_PATH = /^\/(?:p|reel)\/[A-Za-z0-9_-]+\/?$/;

export function parseTimestamp(value: string): number {
  if (/^\d+s?$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);

  if (!match || !match.slice(1).some(Boolean)) {
    throw new Error("Invalid YouTube timestamp");
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;

  return (
    Number.parseInt(hours, 10) * 3600 +
    Number.parseInt(minutes, 10) * 60 +
    Number.parseInt(seconds, 10)
  );
}

export function parseYouTubeUrl(value: string): {
  videoId: string;
  startSeconds: number | null;
} {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("YouTube URLs must use HTTPS");
  }

  let videoId: string | null = null;

  if (
    ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
  ) {
    if (url.pathname !== "/watch") {
      throw new Error("Unsupported YouTube URL");
    }
    videoId = url.searchParams.get("v");
  } else if (url.hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else {
    throw new Error("Unsupported YouTube host");
  }

  if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) {
    throw new Error("Invalid YouTube video ID");
  }

  const timestamp = url.searchParams.get("t") ?? url.searchParams.get("start");

  return {
    videoId,
    startSeconds: timestamp === null ? null : parseTimestamp(timestamp),
  };
}

export function parseInstagramUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
    !INSTAGRAM_POST_PATH.test(url.pathname)
  ) {
    throw new Error("Instagram evidence must be a public post or reel URL");
  }

  return url.toString();
}
