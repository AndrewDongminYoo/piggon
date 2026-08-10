import type { Metadata } from "next";
import { Black_Han_Sans, Noto_Sans_KR } from "next/font/google";

import { SiteShell } from "@/components/site-shell";

import "./globals.css";

const displayFont = Black_Han_Sans({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-piggon-display",
  weight: "400",
});

const bodyFont = Noto_Sans_KR({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-piggon-body",
  weight: ["400", "500", "700", "800"],
});

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
    <html lang="ko" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
