import type { PublicVisit, UserCollectionItem } from "../queries";
import { OwnerVisitControls } from "./owner-visit-controls";
import { VisitCardFrame } from "./visit-card-frame";

type VisitCardProps = {
  ownerVisit: UserCollectionItem;
  visit: PublicVisit;
};

function getModerationNotice(visit: UserCollectionItem): string | null {
  if (visit.hidden) {
    return "관리자가 이 방문 인증을 공개 화면에서 숨겼습니다. 다시 등록해도 숨김 상태가 유지됩니다.";
  }

  return visit.reviewHidden
    ? "관리자가 이 리뷰를 공개 화면에서 숨겼습니다. 다시 작성해도 숨김 상태가 유지됩니다."
    : null;
}

export function VisitCard({ ownerVisit, visit }: VisitCardProps) {
  // Recreated content inherits a standing moderation decision, so the owner is
  // told it applies. Without this the inheritance would be a silent shadow ban.
  const moderationNotice = getModerationNotice(ownerVisit);

  return (
    <VisitCardFrame
      heading={ownerVisit.restaurant.name}
      subheading={ownerVisit.restaurant.region}
      visit={visit}
    >
      {moderationNotice ? (
        <p className="visit-moderation-notice" role="status">
          {moderationNotice}
        </p>
      ) : null}
      <OwnerVisitControls visit={ownerVisit} />
    </VisitCardFrame>
  );
}
