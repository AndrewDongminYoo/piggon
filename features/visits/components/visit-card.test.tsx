import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { PublicVisit, UserCollectionItem } from "../queries";

vi.mock("./owner-visit-controls", () => ({
  OwnerVisitControls: () => <div>소유자 컨트롤</div>,
}));
vi.mock("./visit-card-frame", () => ({
  VisitCardFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { VisitCard } from "./visit-card";

const publicVisit: PublicVisit = {
  displayName: "피자러버",
  evidenceType: "instagram",
  id: "visit-id",
  instagramUrl: "https://www.instagram.com/p/example/",
  photoUrl: null,
  review: null,
  visitedOn: "2026-08-10",
};

function createOwnerVisit(
  overrides: Partial<UserCollectionItem> = {},
): UserCollectionItem {
  return {
    evidenceType: "instagram",
    hidden: false,
    id: "visit-id",
    instagramUrl: "https://www.instagram.com/p/example/",
    photoPath: null,
    photoUrl: null,
    restaurant: {
      id: "restaurant-id",
      isAvailable: true,
      name: "마리오네",
      region: "서울 성동구",
      slug: "marione",
    },
    review: null,
    reviewHidden: false,
    updatedAt: "2026-08-10T00:00:00+00:00",
    visitedOn: "2026-08-10",
    ...overrides,
  };
}

describe("VisitCard moderation notice", () => {
  it("says nothing when the content is visible", () => {
    const markup = renderToStaticMarkup(
      <VisitCard ownerVisit={createOwnerVisit()} visit={publicVisit} />,
    );

    expect(markup).not.toContain("관리자가");
  });

  it("tells the owner a hidden visit stays hidden when recreated", () => {
    const markup = renderToStaticMarkup(
      <VisitCard
        ownerVisit={createOwnerVisit({ hidden: true })}
        visit={publicVisit}
      />,
    );

    expect(markup).toContain(
      "관리자가 이 방문 인증을 공개 화면에서 숨겼습니다",
    );
    expect(markup).toContain("다시 등록해도 숨김 상태가 유지됩니다");
  });

  it("tells the owner a hidden review stays hidden when rewritten", () => {
    const markup = renderToStaticMarkup(
      <VisitCard
        ownerVisit={createOwnerVisit({ reviewHidden: true })}
        visit={publicVisit}
      />,
    );

    expect(markup).toContain("관리자가 이 리뷰를 공개 화면에서 숨겼습니다");
  });
});
