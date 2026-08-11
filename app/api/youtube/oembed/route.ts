import { z } from "zod";

import { requireAdmin } from "@/features/admin/require-admin";
import {
  canonicalizeYouTubeUrl,
  isAllowedYouTubeThumbnail,
} from "@/features/admin/video-schema";

const oEmbedResponseSchema = z.object({
  thumbnail_url: z.string().max(2048),
  title: z.string().trim().min(1).max(300),
});

type MetadataResponse = {
  fetchState: "failed" | "fetched";
  thumbnailUrl: string;
  title: string;
  videoId: string;
};

function failedResponse(videoId: string): MetadataResponse {
  return {
    fetchState: "failed",
    thumbnailUrl: "",
    title: "",
    videoId,
  };
}

export async function GET(request: Request) {
  await requireAdmin();

  const requestedUrl = new URL(request.url).searchParams.get("url") ?? "";
  const canonical = canonicalizeYouTubeUrl(requestedUrl);
  if (!canonical) {
    return Response.json(failedResponse(""), { status: 400 });
  }

  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", canonical.canonicalUrl);

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return Response.json(failedResponse(canonical.videoId));
    }

    const metadata = oEmbedResponseSchema.safeParse(await response.json());
    if (
      !metadata.success ||
      !isAllowedYouTubeThumbnail(metadata.data.thumbnail_url, canonical.videoId)
    ) {
      return Response.json(failedResponse(canonical.videoId));
    }

    return Response.json({
      fetchState: "fetched",
      thumbnailUrl: metadata.data.thumbnail_url,
      title: metadata.data.title,
      videoId: canonical.videoId,
    } satisfies MetadataResponse);
  } catch {
    return Response.json(failedResponse(canonical.videoId));
  }
}
