import type { Metadata } from "next";

import "@fontsource-variable/noto-sans-kr";
import "@fontsource/black-han-sans/korean-400.css";
import "@fontsource/black-han-sans/latin-400.css";

import { SiteShell } from "@/components/site-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Piggon — 피자꼰대 비공식 맛집 지도",
    template: "%s | Piggon",
  },
  description:
    "피자꼰대 영상 속 피자집과 검증된 피자 소식을 한눈에 보는 비공식 팬 지도",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
