import { describe, expect, it } from "vitest";

import { getIntroKeyboardAction, shouldPlayIntro } from "./intro-state";

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

describe("getIntroKeyboardAction", () => {
  it("closes the intro when Escape is pressed", () => {
    expect(
      getIntroKeyboardAction({
        isFirstFocusable: false,
        isLastFocusable: false,
        key: "Escape",
        shiftKey: false,
      }),
    ).toBe("close");
  });

  it.each([
    [false, true, false, "focus-first"],
    [true, false, true, "focus-last"],
  ] as const)(
    "keeps Tab navigation inside the dialog",
    (isFirstFocusable, isLastFocusable, shiftKey, expected) => {
      expect(
        getIntroKeyboardAction({
          isFirstFocusable,
          isLastFocusable,
          key: "Tab",
          shiftKey,
        }),
      ).toBe(expected);
    },
  );
});
