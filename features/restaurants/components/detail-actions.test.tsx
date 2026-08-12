import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DetailActions } from "./detail-actions";

describe("DetailActions", () => {
  // The panel renders the restaurant without the visit form or the reviews, so
  // it has to offer a way to reach the page that does. Losing this link strands
  // the desktop and list flows short of the product's primary action.
  it("offers a route to the full page from the panel", () => {
    const markup = renderToStaticMarkup(
      <DetailActions onBack={() => undefined} restaurantSlug="marione" />,
    );

    expect(markup).toContain('href="/restaurants/marione"');
    expect(markup).toContain("방문 인증하러 가기");
  });

  it("escapes a slug that would otherwise alter the path", () => {
    const markup = renderToStaticMarkup(
      <DetailActions onBack={() => undefined} restaurantSlug="a/b?c" />,
    );

    expect(markup).toContain('href="/restaurants/a%2Fb%3Fc"');
  });

  it("omits the route on the full page, which already shows that content", () => {
    const markup = renderToStaticMarkup(
      <DetailActions restaurantSlug="marione" />,
    );

    expect(markup).not.toContain("방문 인증하러 가기");
    expect(markup).toContain("맛집 지도로");
  });

  it("includes a polite live region for link-copy feedback", () => {
    const markup = renderToStaticMarkup(
      <DetailActions restaurantSlug="marione" />,
    );

    expect(markup).toContain('aria-live="polite"');
  });
});
