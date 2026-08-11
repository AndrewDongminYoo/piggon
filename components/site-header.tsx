"use client";

import Link from "next/link";

type SiteHeaderProps = {
  onReplayIntro: () => void;
};

export function SiteHeader({ onReplayIntro }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand-lockup" href="/">
        <span aria-hidden="true" className="brand-mark">
          P
        </span>
        <span>
          <strong>PIGGON</strong>
          <small>피자꼰대 비공식 맛집 지도</small>
        </span>
      </Link>
      <nav aria-label="주요 메뉴" className="site-nav">
        <Link href="/">맛집 지도</Link>
        <Link href="/me">먹어본 피자</Link>
        <button
          className="box-replay-button"
          onClick={onReplayIntro}
          type="button"
        >
          <span aria-hidden="true" />
          박스 다시 열기
        </button>
      </nav>
    </header>
  );
}
