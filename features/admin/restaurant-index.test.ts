import { describe, expect, it } from "vitest";

import { filterAdminRestaurantIndex } from "./restaurant-index";

const restaurants = [
  { name: "마리오네 성수", status: "published" as const },
  { name: "이짜", status: "draft" as const },
  { name: "더 키친 일포르노", status: "archived" as const },
];

describe("filterAdminRestaurantIndex", () => {
  it("matches a case-insensitive name query within the requested status", () => {
    expect(
      filterAdminRestaurantIndex(restaurants, {
        query: "마리오네",
        status: "published",
      }),
    ).toEqual([{ name: "마리오네 성수", status: "published" }]);
  });

  it("keeps every status when the all-status filter is selected", () => {
    expect(
      filterAdminRestaurantIndex(restaurants, { query: "", status: "all" }),
    ).toHaveLength(3);
  });
});
