import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicVisitCard } from "./public-visit-card";

describe("PublicVisitCard", () => {
  it("never renders a private photo URL for a public visitor", () => {
    const markup = renderToStaticMarkup(
      <PublicVisitCard
        visit={{
          displayName: "피자러버",
          evidenceType: "photo",
          id: "visit-id",
          instagramUrl: null,
          photoUrl: "https://storage.example/private.webp?token=secret",
          review: null,
          visitedOn: "2026-08-11",
        }}
      />,
    );

    expect(markup).not.toContain("token=secret");
    expect(markup).not.toContain("<img");
    expect(markup).toContain("사진으로 방문을 인증했어요.");
  });
});
