"use client";

import { useState, type ReactNode } from "react";

import { PizzaBoxIntro } from "./pizza-box-intro";
import { SiteHeader } from "./site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  const [replayToken, setReplayToken] = useState(0);

  return (
    <>
      <PizzaBoxIntro replayToken={replayToken} />
      <SiteHeader onReplayIntro={() => setReplayToken((value) => value + 1)} />
      <div className="site-content">{children}</div>
      <footer className="site-footer">
        <p>피자꼰대를 좋아하는 마음으로 만든 비공식 팬 프로젝트입니다.</p>
        <p>가게 정보와 영업 여부는 방문 전 다시 확인해 주세요.</p>
      </footer>
    </>
  );
}
