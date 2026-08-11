import { describe, expect, it } from "vitest";

import { getCollectionRestaurant } from "./collection";

describe("getCollectionRestaurant", () => {
  it("keeps published restaurant details editable", () => {
    expect(
      getCollectionRestaurant("restaurant-id", {
        id: "restaurant-id",
        name: "테스트 피자",
        region: "서울",
        slug: "test-pizza",
      }),
    ).toEqual({
      id: "restaurant-id",
      isAvailable: true,
      name: "테스트 피자",
      region: "서울",
      slug: "test-pizza",
    });
  });

  it("keeps an unavailable restaurant as an owner-only deletion entry", () => {
    expect(getCollectionRestaurant("restaurant-id", null)).toEqual({
      id: "restaurant-id",
      isAvailable: false,
      name: "현재 비공개된 맛집",
      region: "운영자 검수 중",
      slug: null,
    });
  });
});
