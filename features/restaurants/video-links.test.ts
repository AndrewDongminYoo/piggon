import { describe, expect, it } from "vitest";

import { buildYouTubeTimestampUrl, formatVideoTimestamp } from "./video-links";

describe("buildYouTubeTimestampUrl", () => {
  it("builds a canonical timestamp URL", () => {
    expect(buildYouTubeTimestampUrl("2lozYHXjAzY", 125)).toBe(
      "https://www.youtube.com/watch?v=2lozYHXjAzY&t=125s",
    );
  });

  it("omits the timestamp when no start time is linked", () => {
    expect(buildYouTubeTimestampUrl("2lozYHXjAzY", null)).toBe(
      "https://www.youtube.com/watch?v=2lozYHXjAzY",
    );
  });
});

describe("formatVideoTimestamp", () => {
  it.each([
    [0, "0:00"],
    [125, "2:05"],
    [3723, "1:02:03"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatVideoTimestamp(seconds)).toBe(expected);
  });
});
