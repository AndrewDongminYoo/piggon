import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteShell } from "./site-shell";

describe("SiteShell", () => {
  it("provides a skip link that targets the page content", () => {
    const markup = renderToStaticMarkup(
      <SiteShell>
        <main>본문</main>
      </SiteShell>,
    );

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('id="main-content"');
    expect(markup.indexOf('href="#main-content"')).toBeLessThan(
      markup.indexOf('class="site-header"'),
    );
  });
});
