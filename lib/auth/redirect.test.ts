import { describe, expect, it } from "vitest";

import { getLoginPath, getSafeNextPath } from "./redirect";

describe("getSafeNextPath", () => {
  it.each([
    ["/restaurants/marione", "/restaurants/marione"],
    ["https://attacker.example", "/"],
    ["//attacker.example", "/"],
    ["/\\attacker.example", "/"],
    [null, "/"],
  ])("maps %s to a safe local path", (input, expected) => {
    expect(getSafeNextPath(input)).toBe(expected);
  });

  it("builds a login route that returns to the collection", () => {
    expect(getLoginPath("/me")).toBe("/auth/login?next=%2Fme");
  });
});
