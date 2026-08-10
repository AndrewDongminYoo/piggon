"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

import {
  deleteReviewInputSchema,
  deleteVisitInputSchema,
  profileInputSchema,
  reviewInputSchema,
  type VisitActionState,
  visitInputSchema,
} from "./schema";
import {
  detectImageMediaType,
  isOwnedVisitPhotoPath,
  pathMatchesMediaType,
  VISIT_EVIDENCE_BUCKET,
  VISIT_IMAGE_MAX_BYTES,
} from "./storage";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
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

function refreshVisitPages(slug: string): void {
  revalidatePath(`/restaurants/${slug}`);
  revalidatePath("/me");
}

function getCurrentSeoulDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

async function getPublishedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<{ id: string; slug: string } | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, slug")
    .eq("id", restaurantId)
    .eq("status", "published")
    .maybeSingle();

  return error ? null : data;
}

async function getOwnedVisit(
  supabase: SupabaseClient,
  visitId: string,
  userId: string,
): Promise<{
  id: string;
  photo_path: string | null;
  restaurant_id: string;
} | null> {
  const { data, error } = await supabase
    .from("visits")
    .select("id, photo_path, restaurant_id")
    .eq("id", visitId)
    .eq("user_id", userId)
    .maybeSingle();

  return error ? null : data;
}

export async function saveDisplayName(
  _previousState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const user = await requireUser();
  const parsed = profileInputSchema.safeParse({
    displayName: getText(formData, "displayName"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error.flatten().fieldErrors),
      message: "표시 이름을 확인해 주세요.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      display_name: parsed.data.displayName,
      id: user.id,
    },
    { onConflict: "id" },
  );

  if (error) {
    return {
      message: "표시 이름을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  revalidatePath("/me");
  return { message: "표시 이름을 저장했습니다.", status: "success" };
}

export async function upsertVisit(
  _previousState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const user = await requireUser();
  const photoPath = getText(formData, "photoPath") || null;
  const parsed = visitInputSchema.safeParse({
    evidenceType: getText(formData, "evidenceType"),
    instagramUrl: getText(formData, "instagramUrl"),
    photoPath,
    rating: getText(formData, "rating"),
    restaurantId: getText(formData, "restaurantId"),
    reviewBody: getText(formData, "reviewBody"),
    visitedOn: getText(formData, "visitedOn"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error.flatten().fieldErrors),
      message: "방문 인증 내용을 확인해 주세요.",
      photoPath,
      status: "error",
    };
  }

  if (parsed.data.visitedOn > getCurrentSeoulDate()) {
    return {
      fieldErrors: { visitedOn: ["오늘 이후의 날짜는 선택할 수 없습니다."] },
      message: "방문 날짜를 확인해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  const supabase = await createClient();
  const [{ data: profile, error: profileError }, restaurant] =
    await Promise.all([
      supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
      getPublishedRestaurant(supabase, parsed.data.restaurantId),
    ]);

  if (profileError || !profile) {
    return {
      message: "방문 인증 전에 공개 표시 이름을 저장해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  if (!restaurant) {
    return {
      message: "공개된 맛집에만 방문을 인증할 수 있습니다.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  if (parsed.data.photoPath) {
    if (
      !isOwnedVisitPhotoPath(
        parsed.data.photoPath,
        user.id,
        parsed.data.restaurantId,
      )
    ) {
      return {
        message: "업로드한 사진 경로를 확인할 수 없습니다.",
        photoPath: parsed.data.photoPath,
        status: "error",
      };
    }

    const { data: photo, error: downloadError } = await supabase.storage
      .from(VISIT_EVIDENCE_BUCKET)
      .download(parsed.data.photoPath);

    if (downloadError || !photo || photo.size > VISIT_IMAGE_MAX_BYTES) {
      return {
        message: "업로드한 사진을 확인하지 못했습니다.",
        photoPath: parsed.data.photoPath,
        status: "error",
      };
    }

    const mediaType = detectImageMediaType(
      new Uint8Array(await photo.arrayBuffer()),
    );

    if (!mediaType || !pathMatchesMediaType(parsed.data.photoPath, mediaType)) {
      return {
        message: "JPEG, PNG 또는 WebP 사진만 사용할 수 있습니다.",
        photoPath: parsed.data.photoPath,
        status: "error",
      };
    }
  }

  const { data: previousVisit } = await supabase
    .from("visits")
    .select("photo_path")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .upsert(
      {
        evidence_type: parsed.data.evidenceType,
        instagram_url: parsed.data.instagramUrl,
        photo_path: parsed.data.photoPath,
        restaurant_id: restaurant.id,
        user_id: user.id,
        visited_on: parsed.data.visitedOn,
      },
      { onConflict: "user_id,restaurant_id" },
    )
    .select("id, photo_path")
    .single();

  if (visitError || !visit) {
    return {
      message: "방문 인증을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  if (
    previousVisit?.photo_path &&
    previousVisit.photo_path !== visit.photo_path
  ) {
    await supabase.storage
      .from(VISIT_EVIDENCE_BUCKET)
      .remove([previousVisit.photo_path]);
  }

  if (parsed.data.rating !== null && parsed.data.reviewBody !== null) {
    const { error: reviewError } = await supabase.from("reviews").upsert(
      {
        body: parsed.data.reviewBody,
        rating: parsed.data.rating,
        visit_id: visit.id,
      },
      { onConflict: "visit_id" },
    );

    refreshVisitPages(restaurant.slug);

    if (reviewError) {
      return {
        message:
          "방문 인증은 저장했지만 리뷰는 저장하지 못했습니다. 리뷰만 다시 시도해 주세요.",
        photoPath: visit.photo_path,
        retryReview: {
          body: parsed.data.reviewBody,
          rating: parsed.data.rating,
        },
        status: "partial",
        visitId: visit.id,
      };
    }
  }

  const ownedVisit = await getOwnedVisit(supabase, visit.id, user.id);
  if (!ownedVisit) {
    return {
      message:
        "방문 인증은 저장했지만 최신 상태를 다시 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
      photoPath: visit.photo_path,
      status: "partial",
      visitId: visit.id,
    };
  }

  refreshVisitPages(restaurant.slug);
  return {
    message: "방문 인증을 저장했습니다.",
    photoPath: ownedVisit.photo_path,
    status: "success",
    visitId: ownedVisit.id,
  };
}

export async function upsertReview(
  _previousState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const user = await requireUser();
  const parsed = reviewInputSchema.safeParse({
    body: getText(formData, "body"),
    rating: getText(formData, "rating"),
    visitId: getText(formData, "visitId"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error.flatten().fieldErrors),
      message: "리뷰 내용을 확인해 주세요.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const visit = await getOwnedVisit(supabase, parsed.data.visitId, user.id);
  if (!visit) {
    return {
      message: "내 방문 인증에만 리뷰를 작성할 수 있습니다.",
      status: "error",
    };
  }

  const restaurant = await getPublishedRestaurant(
    supabase,
    visit.restaurant_id,
  );
  if (!restaurant) {
    return {
      message: "현재 공개된 맛집의 방문 리뷰만 수정할 수 있습니다.",
      status: "error",
    };
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      body: parsed.data.body,
      rating: parsed.data.rating,
      visit_id: visit.id,
    },
    { onConflict: "visit_id" },
  );

  if (error) {
    return {
      message: "리뷰를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    };
  }

  refreshVisitPages(restaurant.slug);
  return { message: "리뷰를 저장했습니다.", status: "success" };
}

export async function deleteVisit(
  _previousState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const user = await requireUser();
  const parsed = deleteVisitInputSchema.safeParse({
    visitId: getText(formData, "visitId"),
  });

  if (!parsed.success) {
    return { message: "삭제할 방문을 확인해 주세요.", status: "error" };
  }

  const supabase = await createClient();
  const visit = await getOwnedVisit(supabase, parsed.data.visitId, user.id);
  if (!visit) {
    return {
      message: "내 방문 인증만 삭제할 수 있습니다.",
      status: "error",
    };
  }

  const restaurant = await getPublishedRestaurant(
    supabase,
    visit.restaurant_id,
  );
  const { error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visit.id)
    .eq("user_id", user.id);

  if (error) {
    return {
      message: "방문 인증을 삭제하지 못했습니다.",
      status: "error",
    };
  }

  let cleanupFailed = false;
  if (visit.photo_path) {
    const { error: storageError } = await supabase.storage
      .from(VISIT_EVIDENCE_BUCKET)
      .remove([visit.photo_path]);
    cleanupFailed = Boolean(storageError);
  }

  if (restaurant) {
    refreshVisitPages(restaurant.slug);
  } else {
    revalidatePath("/me");
  }

  return {
    message: cleanupFailed
      ? "방문 인증은 삭제했지만 사진 정리가 지연되고 있습니다."
      : "방문 인증과 리뷰를 삭제했습니다.",
    status: "success",
  };
}

export async function deleteReview(
  _previousState: VisitActionState,
  formData: FormData,
): Promise<VisitActionState> {
  const user = await requireUser();
  const parsed = deleteReviewInputSchema.safeParse({
    reviewId: getText(formData, "reviewId"),
  });

  if (!parsed.success) {
    return { message: "삭제할 리뷰를 확인해 주세요.", status: "error" };
  }

  const supabase = await createClient();
  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .select("id, visit_id")
    .eq("id", parsed.data.reviewId)
    .maybeSingle();

  if (reviewError || !review) {
    return { message: "리뷰를 찾을 수 없습니다.", status: "error" };
  }

  const visit = await getOwnedVisit(supabase, review.visit_id, user.id);
  if (!visit) {
    return { message: "내 리뷰만 삭제할 수 있습니다.", status: "error" };
  }

  const { error } = await supabase.from("reviews").delete().eq("id", review.id);

  if (error) {
    return { message: "리뷰를 삭제하지 못했습니다.", status: "error" };
  }

  const restaurant = await getPublishedRestaurant(
    supabase,
    visit.restaurant_id,
  );
  if (restaurant) {
    refreshVisitPages(restaurant.slug);
  } else {
    revalidatePath("/me");
  }

  return { message: "리뷰를 삭제했습니다.", status: "success" };
}
