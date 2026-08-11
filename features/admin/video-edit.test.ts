import { describe, expect, it } from "vitest";

import { canReplaceVideoLinks } from "./video-edit";

describe("canReplaceVideoLinks", () => {
  it("allows a new YouTube video", () => {
    expect(canReplaceVideoLinks(null, null)).toBe(true);
  });

  it("allows replacement only after selecting the existing video", () => {
    const videoId = "11111111-1111-1111-1111-111111111111";

    expect(canReplaceVideoLinks(videoId, videoId)).toBe(true);
    expect(canReplaceVideoLinks(videoId, null)).toBe(false);
    expect(
      canReplaceVideoLinks(videoId, "22222222-2222-2222-2222-222222222222"),
    ).toBe(false);
  });

  it("rejects retargeting the edited video at an unregistered YouTube ID", () => {
    expect(
      canReplaceVideoLinks(null, "11111111-1111-1111-1111-111111111111"),
    ).toBe(false);
  });
});
