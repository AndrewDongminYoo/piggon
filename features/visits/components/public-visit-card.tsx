import type { PublicVisit } from "../queries";
import { VisitCardFrame } from "./visit-card-frame";

export function PublicVisitCard({ visit }: { visit: PublicVisit }) {
  return (
    <VisitCardFrame
      heading={visit.displayName}
      subheading={`${visit.visitedOn} 방문`}
      visit={{ ...visit, photoUrl: null }}
    />
  );
}
