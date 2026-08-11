import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoogleSignIn } from "./google-sign-in";

describe("GoogleSignIn", () => {
  it("links to the server OAuth route with a safe return path", () => {
    const markup = renderToStaticMarkup(
      <GoogleSignIn nextPath="/restaurants/fwv?from=detail" />,
    );

    expect(markup).toContain(
      'href="/auth/login?next=%2Frestaurants%2Ffwv%3Ffrom%3Ddetail"',
    );
    expect(markup).toContain("Google로 로그인");
  });

  it("falls back to the homepage for an external return URL", () => {
    const markup = renderToStaticMarkup(
      <GoogleSignIn nextPath="https://attacker.example" />,
    );

    expect(markup).toContain('href="/auth/login?next=%2F"');
  });
});
