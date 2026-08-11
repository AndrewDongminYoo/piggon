"use client";

import Link from "next/link";
import { useActionState } from "react";

import { deleteReview, deleteVisit } from "../actions";
import type { UserCollectionItem } from "../queries";
import { INITIAL_VISIT_ACTION_STATE, type VisitActionState } from "../schema";

function ActionMessage({ state }: { state: VisitActionState }) {
  return state.message ? (
    <p className={`visit-action-message visit-action-message--${state.status}`}>
      {state.message}
    </p>
  ) : null;
}

export function OwnerVisitControls({ visit }: { visit: UserCollectionItem }) {
  const [visitState, visitAction, isDeletingVisit] = useActionState(
    deleteVisit,
    INITIAL_VISIT_ACTION_STATE,
  );
  const [reviewState, reviewAction, isDeletingReview] = useActionState(
    deleteReview,
    INITIAL_VISIT_ACTION_STATE,
  );

  return (
    <div className="visit-card__owner-controls">
      <Link href={`/restaurants/${visit.restaurant.slug}`}>인증 수정하기</Link>
      {visit.review ? (
        <form action={reviewAction}>
          <input name="reviewId" type="hidden" value={visit.review.id} />
          <button disabled={isDeletingReview} type="submit">
            {isDeletingReview ? "리뷰 삭제 중…" : "리뷰만 삭제"}
          </button>
        </form>
      ) : null}
      <form action={visitAction}>
        <input name="visitId" type="hidden" value={visit.id} />
        <button disabled={isDeletingVisit} type="submit">
          {isDeletingVisit ? "인증 삭제 중…" : "방문 인증 삭제"}
        </button>
      </form>
      <ActionMessage state={reviewState} />
      <ActionMessage state={visitState} />
    </div>
  );
}
