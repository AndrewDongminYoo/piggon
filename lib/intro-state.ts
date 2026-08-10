export const INTRO_STORAGE_KEY = "piggon:intro:v1";

type IntroDecision = {
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  hasSeenIntro: boolean;
};

export function shouldPlayIntro({
  hasSeenIntro,
  isDesktop,
  prefersReducedMotion,
}: IntroDecision): boolean {
  return isDesktop && !prefersReducedMotion && !hasSeenIntro;
}
