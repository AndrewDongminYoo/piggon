import { z } from "zod";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const DATABASE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTUBE_HOSTS = new Set([
  "m.youtube.com",
  "www.youtube.com",
  "youtube.com",
]);

function trimOrNull(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export type CanonicalYouTubeVideo = {
  canonicalUrl: string;
  videoId: string;
};

export function canonicalizeYouTubeUrl(
  value: string,
): CanonicalYouTubeVideo | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return null;
    }

    let videoId: string | null = null;
    if (url.hostname === "youtu.be") {
      const pathSegments = url.pathname.split("/").filter(Boolean);
      videoId = pathSegments.length === 1 ? pathSegments[0] : null;
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        const pathSegments = url.pathname.split("/").filter(Boolean);
        videoId =
          pathSegments.length === 2 &&
          ["embed", "live", "shorts"].includes(pathSegments[0])
            ? pathSegments[1]
            : null;
      }
    }

    if (!videoId || !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
      return null;
    }

    return {
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    };
  } catch {
    return null;
  }
}

export function isAllowedYouTubeThumbnail(
  value: string,
  videoId: string,
): boolean {
  try {
    const url = new URL(value);
    const expectedPrefix = `/vi/${videoId}/`;

    return (
      url.protocol === "https:" &&
      url.hostname === "i.ytimg.com" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      url.pathname.startsWith(expectedPrefix) &&
      url.pathname.length > expectedPrefix.length
    );
  } catch {
    return false;
  }
}

const nullableText = (maximum: number) =>
  z.preprocess(trimOrNull, z.union([z.null(), z.string().max(maximum)]));

const videoLinkSchema = z.object({
  contextNote: nullableText(500),
  restaurantId: z.string().regex(DATABASE_ID_PATTERN),
  startSeconds: z.preprocess(
    trimOrNull,
    z.union([z.null(), z.coerce.number().int().min(0).max(2_147_483_647)]),
  ),
});

export const videoAdminSchema = z
  .object({
    fetchState: z.enum(["failed", "fetched", "manual", "pending"]),
    links: z.array(videoLinkSchema).min(1).max(100),
    thumbnailUrl: nullableText(2048),
    title: z.string().trim().min(1).max(300),
    youtubeUrl: z.string().trim().min(1).max(2048),
  })
  .superRefine((value, context) => {
    const canonical = canonicalizeYouTubeUrl(value.youtubeUrl);
    if (!canonical) {
      context.addIssue({
        code: "custom",
        message: "지원하는 HTTPS YouTube 영상 URL을 입력해 주세요.",
        path: ["youtubeUrl"],
      });
      return;
    }

    const restaurantIds = value.links.map((link) => link.restaurantId);
    if (new Set(restaurantIds).size !== restaurantIds.length) {
      context.addIssue({
        code: "custom",
        message: "같은 맛집을 한 영상에 두 번 연결할 수 없습니다.",
        path: ["links"],
      });
    }

    if (
      value.thumbnailUrl &&
      !isAllowedYouTubeThumbnail(value.thumbnailUrl, canonical.videoId)
    ) {
      context.addIssue({
        code: "custom",
        message: "해당 영상의 i.ytimg.com 썸네일 URL만 사용할 수 있습니다.",
        path: ["thumbnailUrl"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    ...canonicalizeYouTubeUrl(value.youtubeUrl)!,
  }));

export type VideoAdminInput = z.output<typeof videoAdminSchema>;

export type VideoAdminActionState = {
  fieldErrors?: Record<string, string[]>;
  formValues?: Record<string, string>;
  message: string;
  status: "idle" | "success" | "error";
  videoId?: string;
};

export const INITIAL_VIDEO_ADMIN_STATE: VideoAdminActionState = {
  message: "",
  status: "idle",
};
