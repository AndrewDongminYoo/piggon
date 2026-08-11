"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

import { requireAdmin } from "./require-admin";
import { canReplaceVideoLinks } from "./video-edit";
import { type VideoAdminActionState, videoAdminSchema } from "./video-schema";

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseLinks(formData: FormData): unknown {
  try {
    return JSON.parse(getText(formData, "links"));
  } catch {
    return "invalid-json";
  }
}

function getFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function getFormSnapshot(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [
      "editingVideoId",
      "fetchState",
      "links",
      "thumbnailUrl",
      "title",
      "youtubeUrl",
    ].map((name) => [name, getText(formData, name)]),
  );
}

function refreshVideoPages(slugs: string[]): void {
  revalidatePath("/");
  revalidatePath("/admin/videos");
  for (const slug of new Set(slugs)) {
    revalidatePath(`/restaurants/${slug}`);
  }
}

export async function saveVideoLinks(
  _previousState: VideoAdminActionState,
  formData: FormData,
): Promise<VideoAdminActionState> {
  await requireAdmin();

  const formValues = getFormSnapshot(formData);
  const parsed = videoAdminSchema.safeParse({
    editingVideoId: getText(formData, "editingVideoId"),
    fetchState: getText(formData, "fetchState"),
    links: parseLinks(formData),
    thumbnailUrl: getText(formData, "thumbnailUrl"),
    title: getText(formData, "title"),
    youtubeUrl: getText(formData, "youtubeUrl"),
  });
  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error.flatten().fieldErrors),
      formValues,
      message: "영상 정보와 연결할 맛집을 확인해 주세요.",
      status: "error",
    };
  }

  const admin = createAdminClient();
  const restaurantIds = parsed.data.links.map((link) => link.restaurantId);
  const { data: restaurants, error: restaurantError } = await admin
    .from("restaurants")
    .select("id, slug")
    .in("id", restaurantIds);
  if (restaurantError || restaurants.length !== restaurantIds.length) {
    return {
      formValues,
      message: "연결할 맛집을 모두 찾을 수 없습니다.",
      status: "error",
    };
  }

  const { data: existingVideo, error: existingVideoError } = await admin
    .from("videos")
    .select("id")
    .eq("youtube_video_id", parsed.data.videoId)
    .maybeSingle();
  if (existingVideoError) {
    return {
      formValues,
      message: "기존 영상 연결을 확인하지 못했습니다.",
      status: "error",
    };
  }

  if (
    !canReplaceVideoLinks(existingVideo?.id ?? null, parsed.data.editingVideoId)
  ) {
    return {
      formValues,
      message: existingVideo
        ? "이미 등록된 영상입니다. 기존 영상 편집에서 선택한 뒤 연결을 수정해 주세요."
        : "편집 중에는 영상 URL을 다른 영상으로 바꿀 수 없습니다. 새 영상으로 등록해 주세요.",
      status: "error",
    };
  }

  let previousRestaurantIds: string[] = [];
  if (existingVideo) {
    const { data: previousLinks, error: previousLinksError } = await admin
      .from("restaurant_videos")
      .select("restaurant_id")
      .eq("video_id", existingVideo.id);
    if (previousLinksError) {
      return {
        formValues,
        message: "기존 영상 연결을 확인하지 못했습니다.",
        status: "error",
      };
    }
    previousRestaurantIds = previousLinks.map((link) => link.restaurant_id);
  }

  const idsForRevalidation = [
    ...new Set([...restaurantIds, ...previousRestaurantIds]),
  ];
  const { data: affectedRestaurants, error: affectedRestaurantsError } =
    await admin.from("restaurants").select("slug").in("id", idsForRevalidation);
  if (affectedRestaurantsError) {
    return {
      formValues,
      message: "영상이 영향을 주는 맛집을 확인하지 못했습니다.",
      status: "error",
    };
  }

  const links = parsed.data.links.map((link) => ({
    context_note: link.contextNote,
    restaurant_id: link.restaurantId,
    start_seconds: link.startSeconds,
  })) satisfies Json;
  const { data: savedVideoId, error: saveError } = await admin.rpc(
    "upsert_video_with_restaurants",
    {
      p_canonical_url: parsed.data.canonicalUrl,
      p_links: links,
      p_metadata_fetch_state:
        parsed.data.fetchState === "fetched" ? "fetched" : "manual",
      p_thumbnail_url: parsed.data.thumbnailUrl ?? "",
      p_title: parsed.data.title,
      p_youtube_video_id: parsed.data.videoId,
    },
  );
  if (saveError || !savedVideoId) {
    return {
      formValues,
      message: "영상과 맛집 연결을 저장하지 못했습니다.",
      status: "error",
    };
  }

  refreshVideoPages(affectedRestaurants.map(({ slug }) => slug));
  return {
    message: "영상 정보와 맛집 연결을 저장했습니다.",
    status: "success",
    videoId: savedVideoId,
  };
}
