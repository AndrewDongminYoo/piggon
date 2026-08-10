import type { PublicVisit } from "../queries";
import { VisitCard } from "./visit-card";

export function ReviewList({ visits }: { visits: PublicVisit[] }) {
  if (visits.length === 0) {
    return (
      <p className="visit-list-empty">
        아직 방문 인증이 없습니다. 첫 번째 피자 발자국을 남겨보세요.
      </p>
    );
  }

  return (
    <div className="visit-list">
      {visits.map((visit) => (
        <VisitCard key={visit.id} visit={visit} />
      ))}
    </div>
  );
}
