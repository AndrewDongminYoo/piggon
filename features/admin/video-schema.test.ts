import { describe, expect, it } from "vitest";

import { canonicalizeYouTubeUrl, videoAdminSchema } from "./video-schema";

const firstRestaurantId = "11111111-1111-1111-1111-111111111111";
const secondRestaurantId = "22222222-2222-2222-2222-222222222222";

const baseVideo = {
  fetchState: "fetched",
  links: [
    {
      contextNote: "이짜",
      restaurantId: firstRestaurantId,
      startSeconds: 30,
    },
  ],
  thumbnailUrl: "https://i.ytimg.com/vi/2lozYHXjAzY/hqdefault.jpg",
  title: "성수 피자 세 곳",
  youtubeUrl: "https://www.youtube.com/watch?v=2lozYHXjAzY",
};

describe("videoAdminSchema", () => {
  it("accepts two restaurants with independent timestamps", () => {
    expect(
      videoAdminSchema.parse({
        ...baseVideo,
        links: [
          {
            restaurantId: firstRestaurantId,
            startSeconds: 30,
            contextNote: "이짜",
          },
          {
            restaurantId: secondRestaurantId,
            startSeconds: 420,
            contextNote: "오르노",
          },
        ],
      }).links,
    ).toHaveLength(2);
  });

  it("canonicalizes supported YouTube URLs", () => {
    expect(canonicalizeYouTubeUrl("https://youtu.be/2lozYHXjAzY?t=30")).toEqual(
      {
        canonicalUrl: "https://www.youtube.com/watch?v=2lozYHXjAzY",
        videoId: "2lozYHXjAzY",
      },
    );
  });

  it("rejects arbitrary hosts and duplicate restaurant links", () => {
    expect(() =>
      videoAdminSchema.parse({
        ...baseVideo,
        links: [baseVideo.links[0], baseVideo.links[0]],
        youtubeUrl: "https://example.com/watch?v=2lozYHXjAzY",
      }),
    ).toThrow();
  });

  it("rejects thumbnails outside the matching YouTube video path", () => {
    expect(() =>
      videoAdminSchema.parse({
        ...baseVideo,
        thumbnailUrl: "https://images.example.com/vi/2lozYHXjAzY/photo.jpg",
      }),
    ).toThrow();

    expect(() =>
      videoAdminSchema.parse({
        ...baseVideo,
        thumbnailUrl: "https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg",
      }),
    ).toThrow();
  });
});
