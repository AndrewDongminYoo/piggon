import type { PublicVisit, UserCollectionItem } from "../queries";
import { OwnerVisitControls } from "./owner-visit-controls";
import { VisitCardFrame } from "./visit-card-frame";

type VisitCardProps = {
  ownerVisit: UserCollectionItem;
  visit: PublicVisit;
};

export function VisitCard({ ownerVisit, visit }: VisitCardProps) {
  return (
    <VisitCardFrame
      heading={ownerVisit.restaurant.name}
      subheading={ownerVisit.restaurant.region}
      visit={visit}
    >
      <OwnerVisitControls visit={ownerVisit} />
    </VisitCardFrame>
  );
}
