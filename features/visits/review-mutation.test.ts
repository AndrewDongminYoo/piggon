import { describe, expect, it } from "vitest";

import { getReviewMutation } from "./review-mutation";

describe("getReviewMutation", () => {
  it("deletes an existing review when the edit opts out", () => {
    expect(getReviewMutation({ body: null, rating: null })).toEqual({
      kind: "delete",
    });
  });

  it("saves a complete rating and review body", () => {
    expect(getReviewMutation({ body: "다시 먹고 싶어요", rating: 5 })).toEqual({
      body: "다시 먹고 싶어요",
      kind: "save",
      rating: 5,
    });
  });
});
