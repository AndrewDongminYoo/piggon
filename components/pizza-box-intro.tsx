"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getIntroKeyboardAction,
  INTRO_STORAGE_KEY,
  shouldPlayIntro,
} from "@/lib/intro-state";

type PizzaBoxIntroProps = {
  replayToken: number;
};

export function PizzaBoxIntro({ replayToken }: PizzaBoxIntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishIntro = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, "seen");
    } catch {
      // Storage can be unavailable in hardened browsers; the intro still closes.
    }

    setIsVisible(false);
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hasSeenIntro = false;

    try {
      hasSeenIntro = window.localStorage.getItem(INTRO_STORAGE_KEY) === "seen";
    } catch {
      hasSeenIntro = false;
    }

    const isReplay = replayToken > 0;
    const shouldPlay = isReplay
      ? desktopQuery.matches && !motionQuery.matches
      : shouldPlayIntro({
          hasSeenIntro,
          isDesktop: desktopQuery.matches,
          prefersReducedMotion: motionQuery.matches,
        });

    if (!shouldPlay) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      if (!desktopQuery.matches || motionQuery.matches) {
        return;
      }

      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setIsVisible(true);
      timerRef.current = setTimeout(finishIntro, 1350);
      requestAnimationFrame(() => skipButtonRef.current?.focus());
    });

    const closeWhenUnsupported = () => {
      if (!desktopQuery.matches || motionQuery.matches) {
        finishIntro();
      }
    };

    desktopQuery.addEventListener("change", closeWhenUnsupported);
    motionQuery.addEventListener("change", closeWhenUnsupported);

    return () => {
      cancelAnimationFrame(animationFrame);
      desktopQuery.removeEventListener("change", closeWhenUnsupported);
      motionQuery.removeEventListener("change", closeWhenUnsupported);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [finishIntro, replayToken]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements.at(-1);
    const action = getIntroKeyboardAction({
      isFirstFocusable: document.activeElement === firstFocusable,
      isLastFocusable: document.activeElement === lastFocusable,
      key: event.key,
      shiftKey: event.shiftKey,
    });

    if (action === null) {
      return;
    }

    event.preventDefault();
    if (action === "close") {
      finishIntro();
    } else if (action === "focus-first") {
      firstFocusable?.focus();
    } else {
      lastFocusable?.focus();
    }
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-label="피자박스 열기"
      aria-modal="true"
      className="pizza-intro"
      onKeyDown={handleDialogKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <button
        className="pizza-intro__skip"
        onClick={finishIntro}
        ref={skipButtonRef}
        type="button"
      >
        건너뛰기
      </button>
      <div aria-hidden="true" className="pizza-box-stage">
        <div className="pizza-box-base">
          <div className="pizza-disc">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="pizza-box-base__map">PIZZA MAP</span>
        </div>
        <div className="pizza-box-lid">
          <span>피자꼰대의</span>
          <strong>피자 지도</strong>
          <small>UNOFFICIAL FAN PROJECT</small>
        </div>
      </div>
      <p className="pizza-intro__caption">
        박스를 열면, 피자 원정이 시작됩니다.
      </p>
    </div>
  );
}
