"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

import { recordValidatedVisitEvidence } from "./evidence-validation-server";
import { getReviewMutation } from "./review-mutation";
import {
  cleanupStoredVisitPhoto,
  reclaimStoredAbandonedVisitPhotos,
  retryStoredVisitPhotoCleanup,
} from "./photo-cleanup-server";
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

async function saveReview(
  supabase: SupabaseClient,
  input: { body: string; rating: number; visitId: string },
): Promise<boolean> {
  const { data: existingReview, error: readError } = await supabase
    .from("reviews")
    .select("id")
    .eq("visit_id", input.visitId)
    .maybeSingle();

  if (readError) {
    return false;
  }

  const { error } = existingReview
    ? await supabase
        .from("reviews")
        .update({ body: input.body, rating: input.rating })
        .eq("id", existingReview.id)
    : await supabase.from("reviews").insert({
        body: input.body,
        rating: input.rating,
        visit_id: input.visitId,
      });

  return !error;
}

async function deleteReviewForVisit(
  supabase: SupabaseClient,
  visitId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("visit_id", visitId);

  return !error;
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
    visitVersion: getText(formData, "visitVersion"),
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

  // Runs after parsing so the path this request is saving is exempt from its own
  // sweep; an upload abandoned by an earlier attempt is reclaimed here.
  await freeVisitEvidenceBudget(user.id, parsed.data.photoPath);

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

    // The signature check above is application code, so the write policy cannot
    // see it. Recording the result is what lets the policy require it.
    if (!(await recordValidatedVisitEvidence(parsed.data.photoPath, user.id))) {
      return {
        message: "업로드한 사진을 확인하지 못했습니다.",
        photoPath: parsed.data.photoPath,
        status: "error",
      };
    }
  }

  const { data: previousVisit } = await supabase
    .from("visits")
    .select("id, photo_path")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  const visitFields = {
    evidence_type: parsed.data.evidenceType,
    instagram_url: parsed.data.instagramUrl,
    photo_path: parsed.data.photoPath,
    visited_on: parsed.data.visitedOn,
  };

  // The update is a compare-and-swap on the version the form was rendered with,
  // not on what the server just re-read — those differ exactly when another tab
  // has written in between, which is the case that must fail. Swapping on
  // photo_path only caught the photo-shaped instance: a tab that had already
  // moved the visit to Instagram left photo_path null, and a stale photo form
  // could then reattach a path the other request was about to delete.
  if (previousVisit && !parsed.data.visitVersion) {
    return {
      message:
        "이 방문 인증을 다시 불러와 주세요. 새로고침한 뒤 다시 시도해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  const visitWrite =
    previousVisit && parsed.data.visitVersion
      ? supabase
          .from("visits")
          .update(visitFields)
          .eq("id", previousVisit.id)
          .eq("updated_at", parsed.data.visitVersion)
      : supabase.from("visits").insert({
          ...visitFields,
          restaurant_id: restaurant.id,
          user_id: user.id,
        });

  const { data: visit, error: visitError } = await visitWrite
    .select("id, photo_path")
    .maybeSingle();

  if (visitError) {
    return {
      message: "방문 인증을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  if (!visit) {
    return {
      message:
        "이 방문 인증이 다른 곳에서 먼저 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.",
      photoPath: parsed.data.photoPath,
      status: "error",
    };
  }

  let photoCleanupPending = false;
  if (
    previousVisit?.photo_path &&
    previousVisit.photo_path !== visit.photo_path
  ) {
    const cleanupResult = await cleanupStoredVisitPhoto(
      previousVisit.photo_path,
      user.id,
    );
    photoCleanupPending = !cleanupResult;
  }

  const reviewMutation = getReviewMutation({
    body: parsed.data.reviewBody,
    rating: parsed.data.rating,
  });
  const reviewSaved =
    reviewMutation.kind === "save"
      ? await saveReview(supabase, {
          body: reviewMutation.body,
          rating: reviewMutation.rating,
          visitId: visit.id,
        })
      : await deleteReviewForVisit(supabase, visit.id);

  if (!reviewSaved) {
    refreshVisitPages(restaurant.slug);
    return {
      message:
        reviewMutation.kind === "save"
          ? "방문 인증은 저장했지만 리뷰는 저장하지 못했습니다. 리뷰만 다시 시도해 주세요."
          : "방문 인증은 저장했지만 기존 리뷰를 삭제하지 못했습니다. 다시 시도해 주세요.",
      photoPath: visit.photo_path,
      retryReview:
        reviewMutation.kind === "save"
          ? {
              body: reviewMutation.body,
              rating: reviewMutation.rating,
            }
          : undefined,
      status: "partial",
      visitId: visit.id,
    };
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
    message: photoCleanupPending
      ? "방문 인증은 저장했고 이전 사진 정리를 재시도하고 있습니다."
      : "방문 인증을 저장했습니다.",
    photoPath: ownedVisit.photo_path,
    status: "success",
    visitId: ownedVisit.id,
  };
}

// Every way evidence budget can be freed, in one place. Two entry points need it
// — a visit write, and the client before retrying an upload the budget refused —
// and they have to free the same set. Deleting an object can fail and land in the
// retry queue, where it still holds budget but is far too recent for the age-gated
// sweep, so a path that only swept would stay blocked until that object aged out.
async function freeVisitEvidenceBudget(
  userId: string,
  exceptPath: string | null,
): Promise<void> {
  await retryStoredVisitPhotoCleanup(userId);
  await reclaimStoredAbandonedVisitPhotos(userId, exceptPath);
}

// Reachable before an upload, unlike the work inside upsertVisit: once objects
// fill the budget the upload fails, which stops the visit write, and with it the
// cleanup that would have freed the budget.
export async function reclaimAbandonedVisitEvidence(): Promise<void> {
  const user = await requireUser();
  await freeVisitEvidenceBudget(user.id, null);
}

// Rolls back an upload whose visit write failed. The browser cannot retry a failed
// delete, so this routes the discard through the same remove-or-queue driver that
// deletion uses; a transient Storage failure leaves a cleanup job instead of an
// orphan counting against the uploader's evidence quota.
export async function discardUploadedVisitPhoto(
  restaurantId: string,
  photoPath: string,
): Promise<void> {
  const user = await requireUser();
  if (!isOwnedVisitPhotoPath(photoPath, user.id, restaurantId)) {
    return;
  }

  const supabase = await createClient();
  const { data: savedVisit, error } = await supabase
    .from("visits")
    .select("id")
    .eq("user_id", user.id)
    .eq("photo_path", photoPath)
    .maybeSingle();

  // A path a visit still points at is evidence, not a leftover upload.
  if (error || savedVisit) {
    return;
  }

  await cleanupStoredVisitPhoto(photoPath, user.id);
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

  const reviewSaved = await saveReview(supabase, {
    body: parsed.data.body,
    rating: parsed.data.rating,
    visitId: visit.id,
  });

  if (!reviewSaved) {
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
  await retryStoredVisitPhotoCleanup(user.id);
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
  // Clean the path the delete actually removed, not the one read a moment ago. A
  // concurrent replacement can commit a new path in between, and cleaning the
  // stale one would strand the new object as unreferenced evidence forever.
  const { data: deleted, error } = await supabase
    .from("visits")
    .delete()
    .eq("id", visit.id)
    .eq("user_id", user.id)
    .select("photo_path")
    .maybeSingle();

  if (error) {
    return {
      message: "방문 인증을 삭제하지 못했습니다.",
      status: "error",
    };
  }

  if (!deleted) {
    return {
      message: "이미 삭제된 방문 인증입니다.",
      status: "error",
    };
  }

  let cleanupFailed = false;
  if (deleted.photo_path) {
    cleanupFailed = !(await cleanupStoredVisitPhoto(
      deleted.photo_path,
      user.id,
    ));
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
