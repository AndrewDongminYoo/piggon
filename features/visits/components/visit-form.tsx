"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  discardUploadedVisitPhoto,
  saveDisplayName,
  upsertReview,
  upsertVisit,
} from "../actions";
import type { ViewerVisit } from "../queries";
import { INITIAL_VISIT_ACTION_STATE, type VisitActionState } from "../schema";
import {
  createVisitPhotoPath,
  detectImageMediaType,
  extensionForMediaType,
  VISIT_EVIDENCE_BUCKET,
  VISIT_IMAGE_MAX_BYTES,
} from "../storage";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <small className="form-field-error">{errors[0]}</small>
  ) : null;
}

function ActionMessage({ state }: { state: VisitActionState }) {
  return state.message ? (
    <p
      className={`visit-action-message visit-action-message--${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

export function ProfileForm({ displayName = "" }: { displayName?: string }) {
  const router = useRouter();
  async function submitProfile(
    previousState: VisitActionState,
    formData: FormData,
  ): Promise<VisitActionState> {
    const state = await saveDisplayName(previousState, formData);
    if (state.status === "success") {
      router.refresh();
    }
    return state;
  }

  const [state, action, isPending] = useActionState(
    submitProfile,
    INITIAL_VISIT_ACTION_STATE,
  );

  return (
    <form action={action} className="profile-form">
      <label htmlFor="displayName">커뮤니티 표시 이름</label>
      <p>Google 이메일 대신 이 이름만 다른 피자 팬에게 공개됩니다.</p>
      <div className="profile-form__row">
        <input
          defaultValue={displayName}
          id="displayName"
          maxLength={30}
          minLength={2}
          name="displayName"
          placeholder="예: 피자탐험대"
          required
        />
        <button disabled={isPending} type="submit">
          {isPending ? "저장 중…" : "이름 저장"}
        </button>
      </div>
      <FieldError errors={state.fieldErrors?.displayName} />
      <ActionMessage state={state} />
    </form>
  );
}

function ReviewRetryForm({
  review,
  visitId,
}: {
  review: { body: string; rating: number };
  visitId: string;
}) {
  const [state, action, isPending] = useActionState(
    upsertReview,
    INITIAL_VISIT_ACTION_STATE,
  );

  return (
    <form action={action} className="review-retry-form">
      <input name="visitId" type="hidden" value={visitId} />
      <input name="rating" type="hidden" value={review.rating} />
      <input name="body" type="hidden" value={review.body} />
      <button disabled={isPending} type="submit">
        {isPending ? "리뷰 재시도 중…" : "리뷰만 다시 저장"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

type VisitFormProps = {
  currentDate: string;
  existingVisit: ViewerVisit | null;
  restaurantId: string;
  userId: string;
};

export function VisitForm({
  currentDate,
  existingVisit,
  restaurantId,
  userId,
}: VisitFormProps) {
  const router = useRouter();
  const [evidenceType, setEvidenceType] = useState<"photo" | "instagram">(
    existingVisit?.evidenceType ?? "photo",
  );

  async function submitVisit(
    previousState: VisitActionState,
    submittedFormData: FormData,
  ): Promise<VisitActionState> {
    const formData = new FormData();
    for (const [key, value] of submittedFormData.entries()) {
      if (key !== "photo") {
        formData.append(key, value);
      }
    }

    const submittedEvidenceType = formData.get("evidenceType");
    const photo = submittedFormData.get("photo");
    let uploadedPath: string | null = null;

    try {
      if (
        submittedEvidenceType === "photo" &&
        photo instanceof File &&
        photo.size > 0
      ) {
        if (photo.size > VISIT_IMAGE_MAX_BYTES) {
          return {
            fieldErrors: { photo: ["사진은 8 MiB 이하여야 합니다."] },
            message: "방문 사진을 확인해 주세요.",
            status: "error",
          };
        }

        const bytes = new Uint8Array(await photo.arrayBuffer());
        const mediaType = detectImageMediaType(bytes);
        if (!mediaType) {
          return {
            fieldErrors: {
              photo: ["JPEG, PNG 또는 WebP 사진만 사용할 수 있습니다."],
            },
            message: "방문 사진을 확인해 주세요.",
            status: "error",
          };
        }

        uploadedPath = createVisitPhotoPath(
          userId,
          restaurantId,
          extensionForMediaType(mediaType),
        );
        const supabase = createClient();
        const { error } = await supabase.storage
          .from(VISIT_EVIDENCE_BUCKET)
          .upload(uploadedPath, photo, {
            contentType: mediaType,
            upsert: false,
          });

        if (error) {
          return {
            message:
              "사진을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            status: "error",
          };
        }

        formData.set("photoPath", uploadedPath);
      } else if (submittedEvidenceType === "photo") {
        formData.set("photoPath", existingVisit?.photoPath ?? "");
      } else {
        formData.set("photoPath", "");
      }

      const state = await upsertVisit(previousState, formData);
      if (state.status === "error" && uploadedPath) {
        await discardUploadedVisitPhoto(restaurantId, uploadedPath);
      } else if (state.status === "success" || state.status === "partial") {
        router.refresh();
      }
      return state;
    } catch {
      if (uploadedPath) {
        // Already on the failure path; a failed discard must not replace the
        // user-facing message with a crash.
        await discardUploadedVisitPhoto(restaurantId, uploadedPath).catch(
          () => undefined,
        );
      }

      return {
        message: "방문 인증을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        status: "error",
      };
    }
  }

  const [state, action, isPending] = useActionState(
    submitVisit,
    INITIAL_VISIT_ACTION_STATE,
  );

  return (
    <div className="visit-form-wrap">
      <form action={action} className="visit-form">
        <input name="restaurantId" type="hidden" value={restaurantId} />

        <fieldset>
          <legend>방문 인증 방식</legend>
          <div className="evidence-choice">
            <label>
              <input
                checked={evidenceType === "photo"}
                name="evidenceType"
                onChange={() => setEvidenceType("photo")}
                type="radio"
                value="photo"
              />
              <span>사진 업로드</span>
            </label>
            <label>
              <input
                checked={evidenceType === "instagram"}
                name="evidenceType"
                onChange={() => setEvidenceType("instagram")}
                type="radio"
                value="instagram"
              />
              <span>Instagram 링크</span>
            </label>
          </div>
        </fieldset>

        <label className="visit-form__field">
          <span>방문 날짜</span>
          <input
            defaultValue={existingVisit?.visitedOn ?? currentDate}
            max={currentDate}
            name="visitedOn"
            required
            type="date"
          />
          <FieldError errors={state.fieldErrors?.visitedOn} />
        </label>

        {evidenceType === "photo" ? (
          <label className="visit-form__field">
            <span>
              방문 사진 {existingVisit?.photoPath ? "(바꿀 때만 선택)" : ""}
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              name="photo"
              required={!existingVisit?.photoPath}
              type="file"
            />
            <small>JPEG, PNG, WebP · 최대 8 MiB</small>
            <FieldError
              errors={state.fieldErrors?.photo ?? state.fieldErrors?.photoPath}
            />
          </label>
        ) : (
          <label className="visit-form__field">
            <span>공개 Instagram 게시물 또는 릴</span>
            <input
              defaultValue={existingVisit?.instagramUrl ?? ""}
              name="instagramUrl"
              placeholder="https://www.instagram.com/p/.../"
              required
              type="url"
            />
            <FieldError errors={state.fieldErrors?.instagramUrl} />
          </label>
        )}

        <fieldset className="visit-review-fields">
          <legend>한 줄 리뷰 (선택)</legend>
          <label>
            <span>별점</span>
            <select
              defaultValue={existingVisit?.review?.rating ?? ""}
              name="rating"
            >
              <option value="">리뷰 안 남기기</option>
              <option value="5">5 — 또 먹고 싶어요</option>
              <option value="4">4 — 추천해요</option>
              <option value="3">3 — 괜찮아요</option>
              <option value="2">2 — 아쉬워요</option>
              <option value="1">1 — 내 취향은 아니에요</option>
            </select>
            <FieldError errors={state.fieldErrors?.rating} />
          </label>
          <label>
            <span>리뷰</span>
            <textarea
              defaultValue={existingVisit?.review?.body ?? ""}
              maxLength={2000}
              name="reviewBody"
              placeholder="어떤 피자였는지 다른 팬에게 알려주세요."
              rows={4}
            />
            <FieldError errors={state.fieldErrors?.reviewBody} />
          </label>
        </fieldset>

        <button className="visit-submit" disabled={isPending} type="submit">
          {isPending
            ? "인증 저장 중…"
            : existingVisit
              ? "방문 인증 업데이트"
              : "먹어봤어요 인증"}
        </button>
        <ActionMessage state={state} />
      </form>

      {state.status === "partial" && state.retryReview && state.visitId ? (
        <ReviewRetryForm review={state.retryReview} visitId={state.visitId} />
      ) : null}
    </div>
  );
}
