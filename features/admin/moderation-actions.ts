"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

import { requireAdmin } from "./require-admin";

const databaseIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export type ModerationActionState = {
  message: string;
  status: "idle" | "success" | "error";
};

function getId(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  const parsed = databaseIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function refreshModeratedContent(slug: string): void {
  revalidatePath("/admin/moderation");
  revalidatePath(`/restaurants/${slug}`);
  revalidatePath("/me");
}

async function updateVisitHidden(
  formData: FormData,
  hidden: boolean,
): Promise<ModerationActionState> {
  await requireAdmin();

  const visitId = getId(formData, "visitId");
  if (!visitId) {
    return { message: "방문 인증을 확인해 주세요.", status: "error" };
  }

  const admin = createAdminClient();
  const { data: visit, error: visitError } = await admin
    .from("visits")
    .select("id, restaurant_id")
    .eq("id", visitId)
    .maybeSingle();
  if (visitError || !visit) {
    return { message: "방문 인증을 찾을 수 없습니다.", status: "error" };
  }

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .select("slug")
    .eq("id", visit.restaurant_id)
    .maybeSingle();
  if (restaurantError || !restaurant) {
    return { message: "연결된 맛집을 찾을 수 없습니다.", status: "error" };
  }

  const { data: updated, error: updateError } = await admin
    .from("visits")
    .update({ hidden })
    .eq("id", visit.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return {
      message: "방문 인증 상태를 바꾸지 못했습니다.",
      status: "error",
    };
  }

  refreshModeratedContent(restaurant.slug);
  return {
    message: hidden
      ? "방문 인증을 공개 화면에서 숨겼습니다."
      : "방문 인증을 공개 화면에 복원했습니다.",
    status: "success",
  };
}

async function updateReviewHidden(
  formData: FormData,
  hidden: boolean,
): Promise<ModerationActionState> {
  await requireAdmin();

  const reviewId = getId(formData, "reviewId");
  if (!reviewId) {
    return { message: "리뷰를 확인해 주세요.", status: "error" };
  }

  const admin = createAdminClient();
  const { data: review, error: reviewError } = await admin
    .from("reviews")
    .select("id, visit_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError || !review) {
    return { message: "리뷰를 찾을 수 없습니다.", status: "error" };
  }

  const { data: visit, error: visitError } = await admin
    .from("visits")
    .select("restaurant_id")
    .eq("id", review.visit_id)
    .maybeSingle();
  if (visitError || !visit) {
    return { message: "연결된 방문 인증을 찾을 수 없습니다.", status: "error" };
  }

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .select("slug")
    .eq("id", visit.restaurant_id)
    .maybeSingle();
  if (restaurantError || !restaurant) {
    return { message: "연결된 맛집을 찾을 수 없습니다.", status: "error" };
  }

  const { data: updated, error: updateError } = await admin
    .from("reviews")
    .update({ hidden })
    .eq("id", review.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return { message: "리뷰 상태를 바꾸지 못했습니다.", status: "error" };
  }

  refreshModeratedContent(restaurant.slug);
  return {
    message: hidden
      ? "리뷰를 공개 화면에서 숨겼습니다."
      : "리뷰를 공개 화면에 복원했습니다.",
    status: "success",
  };
}

export async function hideVisit(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  return updateVisitHidden(formData, true);
}

export async function restoreVisit(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  return updateVisitHidden(formData, false);
}

export async function hideReview(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  return updateReviewHidden(formData, true);
}

export async function restoreReview(
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  return updateReviewHidden(formData, false);
}
