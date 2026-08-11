import { z } from "zod";

import { parseInstagramUrl } from "@/features/restaurants/validators";

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function trimmedStringOrNull(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const nullableRating = z.preprocess(
  emptyStringToNull,
  z.union([z.coerce.number().int().min(1).max(5), z.null()]),
);

const nullableReviewBody = z.preprocess(
  trimmedStringOrNull,
  z.string().min(1).max(2000).nullable(),
);

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(30),
});

export const visitInputSchema = z
  .object({
    evidenceType: z.enum(["photo", "instagram"]),
    instagramUrl: z.preprocess(
      trimmedStringOrNull,
      z.string().max(2048).nullable(),
    ),
    photoPath: z.preprocess(
      trimmedStringOrNull,
      z.string().max(512).nullable(),
    ),
    rating: nullableRating,
    restaurantId: z.string().uuid(),
    reviewBody: nullableReviewBody,
    // The visits.updated_at the form was rendered with, echoed back so the write
    // can refuse to land on a row that has moved since. Genuinely absent for a
    // first visit, so a missing field is null rather than an error.
    visitVersion: z.preprocess(
      (value) => (value === undefined ? null : trimmedStringOrNull(value)),
      z.string().max(64).nullable(),
    ),
    visitedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isCalendarDate, "방문 날짜를 확인해 주세요."),
  })
  .superRefine((value, context) => {
    if (value.evidenceType === "photo") {
      if (!value.photoPath) {
        context.addIssue({
          code: "custom",
          message: "방문 사진을 업로드해 주세요.",
          path: ["photoPath"],
        });
      }

      if (value.instagramUrl) {
        context.addIssue({
          code: "custom",
          message: "사진과 Instagram 링크 중 하나만 선택해 주세요.",
          path: ["instagramUrl"],
        });
      }
    } else {
      if (value.photoPath) {
        context.addIssue({
          code: "custom",
          message: "사진과 Instagram 링크 중 하나만 선택해 주세요.",
          path: ["photoPath"],
        });
      }

      if (!value.instagramUrl) {
        context.addIssue({
          code: "custom",
          message: "Instagram 게시물 또는 릴 링크를 입력해 주세요.",
          path: ["instagramUrl"],
        });
      } else {
        try {
          parseInstagramUrl(value.instagramUrl);
        } catch {
          context.addIssue({
            code: "custom",
            message: "공개 Instagram 게시물 또는 릴 링크를 확인해 주세요.",
            path: ["instagramUrl"],
          });
        }
      }
    }

    if ((value.rating === null) !== (value.reviewBody === null)) {
      context.addIssue({
        code: "custom",
        message: "별점과 리뷰는 함께 입력해 주세요.",
        path: value.rating === null ? ["rating"] : ["reviewBody"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    instagramUrl:
      value.evidenceType === "instagram" && value.instagramUrl
        ? parseInstagramUrl(value.instagramUrl)
        : null,
    photoPath: value.evidenceType === "photo" ? value.photoPath : null,
  }));

export const reviewInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  visitId: z.string().uuid(),
});

export const deleteVisitInputSchema = z.object({
  visitId: z.string().uuid(),
});

export const deleteReviewInputSchema = z.object({
  reviewId: z.string().uuid(),
});

export type VisitActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string;
  photoPath?: string | null;
  retryReview?: {
    body: string;
    rating: number;
  };
  status: "idle" | "success" | "error" | "partial";
  visitId?: string;
};

export const INITIAL_VISIT_ACTION_STATE: VisitActionState = {
  message: "",
  status: "idle",
};
