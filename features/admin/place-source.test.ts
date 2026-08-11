import { describe, expect, it } from "vitest";

import { getNextPlaceSource } from "./place-source";

describe("getNextPlaceSource", () => {
  it("refreshes an empty or previously auto-filled source", () => {
    expect(
      getNextPlaceSource(
        { autoUrl: "", url: "" },
        "https://place.map.kakao.com/second",
      ),
    ).toEqual({
      autoUrl: "https://place.map.kakao.com/second",
      url: "https://place.map.kakao.com/second",
    });

    expect(
      getNextPlaceSource(
        {
          autoUrl: "https://place.map.kakao.com/first",
          url: "https://place.map.kakao.com/first",
        },
        "https://place.map.kakao.com/second",
      ),
    ).toEqual({
      autoUrl: "https://place.map.kakao.com/second",
      url: "https://place.map.kakao.com/second",
    });
  });

  it("preserves a manual source override when the place changes", () => {
    expect(
      getNextPlaceSource(
        {
          autoUrl: "https://place.map.kakao.com/first",
          url: "https://example.com/manual-source",
        },
        "https://place.map.kakao.com/second",
      ),
    ).toEqual({
      autoUrl: "https://place.map.kakao.com/second",
      url: "https://example.com/manual-source",
    });
  });
});
