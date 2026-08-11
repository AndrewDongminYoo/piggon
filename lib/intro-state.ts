export const INTRO_STORAGE_KEY = "piggon:intro:v1";

type IntroDecision = {
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  hasSeenIntro: boolean;
};

type IntroKeyboardInput = {
  isFirstFocusable: boolean;
  isLastFocusable: boolean;
  key: string;
  shiftKey: boolean;
};

export type IntroKeyboardAction = "close" | "focus-first" | "focus-last" | null;

export function getIntroKeyboardAction({
  isFirstFocusable,
  isLastFocusable,
  key,
  shiftKey,
}: IntroKeyboardInput): IntroKeyboardAction {
  if (key === "Escape") {
    return "close";
  }

  if (key !== "Tab") {
    return null;
  }

  if (shiftKey && isFirstFocusable) {
    return "focus-last";
  }

  if (!shiftKey && isLastFocusable) {
    return "focus-first";
  }

  return null;
}

export function shouldPlayIntro({
  hasSeenIntro,
  isDesktop,
  prefersReducedMotion,
}: IntroDecision): boolean {
  return isDesktop && !prefersReducedMotion && !hasSeenIntro;
}
