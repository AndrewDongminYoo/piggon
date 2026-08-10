import { describe, expect, it } from "vitest";

import {
  parseInstagramUrl,
  parseTimestamp,
  parseYouTubeUrl,
} from "./validators";

describe("parseYouTubeUrl", () => {
  it("parses a canonical video URL and timestamp", () => {
    expect(
      parseYouTubeUrl("https://www.youtube.com/watch?v=2lozYHXjAzY&t=2m5s"),
    ).toEqual({
      videoId: "2lozYHXjAzY",
      startSeconds: 125,
    });
  });

  it("parses a short video URL", () => {
    expect(parseYouTubeUrl("https://youtu.be/2lozYHXjAzY?t=125")).toEqual({
      videoId: "2lozYHXjAzY",
      startSeconds: 125,
    });
  });

  it("rejects lookalike hosts", () => {
    expect(() =>
      parseYouTubeUrl(
        "https://youtube.com.attacker.example/watch?v=2lozYHXjAzY",
      ),
    ).toThrow();
  });
});

describe("parseTimestamp", () => {
  it.each([
    ["125", 125],
    ["125s", 125],
    ["2m5s", 125],
    ["1h2m3s", 3723],
  ])("parses %s", (input, expected) => {
    expect(parseTimestamp(input)).toBe(expected);
  });

  it("rejects partial timestamp syntax", () => {
    expect(() => parseTimestamp("2minutes")).toThrow();
  });
});

describe("parseInstagramUrl", () => {
  it.each([
    "https://www.instagram.com/p/example/",
    "https://instagram.com/reel/example/",
  ])("accepts a public post URL", (input) => {
    expect(parseInstagramUrl(input)).toBe(input);
  });

  it("rejects profile URLs", () => {
    expect(() => parseInstagramUrl("https://instagram.com/example")).toThrow();
  });
});
