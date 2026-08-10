"use client";

import Link from "next/link";
import { useActionState } from "react";

import { deleteReview, deleteVisit } from "../actions";
import { INITIAL_VISIT_ACTION_STATE, type VisitActionState } from "../schema";
import type { PublicVisit, UserCollectionItem } from "../queries";

type VisitCardProps = {
  ownerVisit?: UserCollectionItem;
  visit: PublicVisit;
};

function ActionMessage({ state }: { state: VisitActionState }) {
  return state.message ? (
    <p className={`visit-action-message visit-action-message--${state.status}`}>
      {state.message}
    </p>
  ) : null;
}

function OwnerControls({ visit }: { visit: UserCollectionItem }) {
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

export function VisitCard({ ownerVisit, visit }: VisitCardProps) {
  const heading = ownerVisit?.restaurant.name ?? visit.displayName;
  const subheading = ownerVisit
    ? ownerVisit.restaurant.region
    : `${visit.visitedOn} 방문`;

  return (
    <article className="visit-card">
      <header className="visit-card__header">
        <div>
          <strong>{heading}</strong>
          <small>{subheading}</small>
        </div>
        <span>{visit.visitedOn}</span>
      </header>

      {visit.photoUrl ? (
        <div className="visit-card__photo">
          {/* A short-lived private URL cannot be processed safely by the Next image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${heading} 방문 인증 사진`}
            height="720"
            src={visit.photoUrl}
            width="960"
          />
        </div>
      ) : visit.instagramUrl ? (
        <a
          className="visit-card__instagram"
          href={visit.instagramUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Instagram 방문 인증 보기 ↗
        </a>
      ) : (
        <p className="visit-card__evidence-missing">
          인증 사진을 불러오는 중입니다.
        </p>
      )}

      {visit.review ? (
        <div className="visit-card__review">
          <span aria-label={`별점 ${visit.review.rating}점`}>
            {"★".repeat(visit.review.rating)}
            {"☆".repeat(5 - visit.review.rating)}
          </span>
          <p>{visit.review.body}</p>
        </div>
      ) : (
        <p className="visit-card__no-review">리뷰 없이 방문만 인증했어요.</p>
      )}

      {ownerVisit ? <OwnerControls visit={ownerVisit} /> : null}
    </article>
  );
}
