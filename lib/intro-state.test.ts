import { describe, expect, it } from "vitest";

import { shouldPlayIntro } from "./intro-state";

describe("shouldPlayIntro", () => {
  it.each([
    [
      { isDesktop: true, prefersReducedMotion: false, hasSeenIntro: false },
      true,
    ],
    [
      { isDesktop: false, prefersReducedMotion: false, hasSeenIntro: false },
      false,
    ],
    [
      { isDesktop: true, prefersReducedMotion: true, hasSeenIntro: false },
      false,
    ],
    [
      { isDesktop: true, prefersReducedMotion: false, hasSeenIntro: true },
      false,
    ],
  ])("returns the expected intro decision", (input, expected) => {
    expect(shouldPlayIntro(input)).toBe(expected);
  });
});
