import type { ReactNode } from "react";

import type { PublicVisit } from "../queries";

type VisitCardFrameProps = {
  children?: ReactNode;
  heading: string;
  subheading: string;
  visit: PublicVisit;
};

export function VisitCardFrame({
  children,
  heading,
  subheading,
  visit,
}: VisitCardFrameProps) {
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

      {children}
    </article>
  );
}
