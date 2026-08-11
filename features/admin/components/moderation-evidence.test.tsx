import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModerationEvidence } from "./moderation-evidence";

describe("ModerationEvidence", () => {
  it("renders a linked preview for uploaded visit photos", () => {
    const markup = renderToStaticMarkup(
      <ModerationEvidence
        evidenceType="photo"
        evidenceUrl="https://project.supabase.co/storage/photo.webp?token=signed"
        restaurantName="테스트 피자"
      />,
    );

    expect(markup).toContain("방문 인증 사진 원본 보기");
    expect(markup).toContain("테스트 피자 방문 인증 사진");
    expect(markup).toContain(
      "https://project.supabase.co/storage/photo.webp?token=signed",
    );
  });

  it("renders a safe external action for Instagram evidence", () => {
    const markup = renderToStaticMarkup(
      <ModerationEvidence
        evidenceType="instagram"
        evidenceUrl="https://www.instagram.com/p/example/"
        restaurantName="테스트 피자"
      />,
    );

    expect(markup).toContain("Instagram 게시물 열기");
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('target="_blank"');
  });

  it("explains when evidence cannot be loaded", () => {
    const markup = renderToStaticMarkup(
      <ModerationEvidence
        evidenceType="photo"
        evidenceUrl={null}
        restaurantName="테스트 피자"
      />,
    );

    expect(markup).toContain("증거를 불러오지 못했습니다.");
  });
});
