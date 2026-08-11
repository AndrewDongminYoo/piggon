"use client";

import Link from "next/link";
import { useState } from "react";

type DetailActionsProps = {
  onBack?: () => void;
  restaurantSlug: string;
};

type CopyState = "idle" | "copied" | "error";

export function DetailActions({ onBack, restaurantSlug }: DetailActionsProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyDetailLink(): Promise<void> {
    try {
      const url = new URL(
        `/restaurants/${encodeURIComponent(restaurantSlug)}`,
        window.location.origin,
      );
      await navigator.clipboard.writeText(url.toString());
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="restaurant-detail__nav">
      {onBack ? (
        <button className="detail-back" onClick={onBack} type="button">
          ← 목록으로
        </button>
      ) : (
        <Link className="detail-back" href="/">
          ← 맛집 지도로
        </Link>
      )}
      {/* The panel shows the restaurant but not the visit form or the reviews,
          which only the full page renders. Without this the desktop and list
          flows dead-end: the visit action is reachable only by copying the link
          and opening it by hand. Lives here so every panel usage gets it. */}
      {onBack ? (
        <Link
          className="detail-open"
          href={`/restaurants/${encodeURIComponent(restaurantSlug)}`}
        >
          방문 인증하러 가기 →
        </Link>
      ) : null}
      <button className="detail-share" onClick={copyDetailLink} type="button">
        {copyState === "copied"
          ? "링크 복사 완료"
          : copyState === "error"
            ? "복사하지 못했어요"
            : "상세 링크 복사"}
      </button>
    </div>
  );
}
