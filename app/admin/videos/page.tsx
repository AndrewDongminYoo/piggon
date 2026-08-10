import type { Metadata } from "next";

import {
  VideoForm,
  type VideoEditorValue,
} from "@/features/admin/components/video-form";
import { requireAdmin } from "@/features/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "영상 관리",
};

function parseFetchState(value: string): VideoEditorValue["fetchState"] {
  return ["failed", "fetched", "manual", "pending"].includes(value)
    ? (value as VideoEditorValue["fetchState"])
    : "pending";
}

export default async function AdminVideosPage() {
  await requireAdmin();

  const admin = createAdminClient();
  const [restaurantResult, videoResult] = await Promise.all([
    admin.from("restaurants").select("id, name, region, status").order("name"),
    admin
      .from("videos")
      .select(
        `
          id,
          youtube_video_id,
          canonical_url,
          title,
          thumbnail_url,
          metadata_fetch_state,
          restaurant_videos (
            restaurant_id,
            start_seconds,
            context_note
          )
        `,
      )
      .order("updated_at", { ascending: false }),
  ]);

  if (restaurantResult.error || videoResult.error) {
    throw new Error("Unable to load video administration data", {
      cause: restaurantResult.error ?? videoResult.error,
    });
  }

  const videos: VideoEditorValue[] = videoResult.data.map((video) => ({
    canonicalUrl: video.canonical_url,
    fetchState: parseFetchState(video.metadata_fetch_state),
    id: video.id,
    links: video.restaurant_videos.map((link) => ({
      contextNote: link.context_note,
      restaurantId: link.restaurant_id,
      startSeconds: link.start_seconds,
    })),
    thumbnailUrl: video.thumbnail_url,
    title: video.title,
    videoId: video.youtube_video_id,
  }));

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span>VIDEO RELATION INDEX</span>
          <h1>영상 관리</h1>
          <p>
            YouTube 영상 하나를 여러 맛집에 연결하고, 각 맛집의 시작 시점을 따로
            기록합니다.
          </p>
        </div>
        <strong>{videos.length} VIDEOS</strong>
      </header>

      <VideoForm restaurants={restaurantResult.data} videos={videos} />
    </main>
  );
}
