import { describe, expect, it } from "vitest";

import { filterRestaurants, getAvailabilityState } from "./filters";
import type { RestaurantSummary } from "./types";

const endedPopup: RestaurantSummary = {
  id: "popup-id",
  slug: "ended-popup",
  name: "종료 팝업",
  alternateName: null,
  region: "서울",
  address: "서울",
  kakaoPlaceId: "place-id",
  latitude: 37.5,
  longitude: 127,
  kind: "popup",
  sourceUrl: "https://example.com/source",
  certifications: [],
  awards: [],
  availabilityPeriods: [
    { startsOn: "2026-01-01", endsOn: "2026-01-31", note: null },
  ],
  videos: [],
};

describe("getAvailabilityState", () => {
  it("returns current when a period includes the current date", () => {
    expect(
      getAvailabilityState(
        [{ startsOn: "2026-08-01", endsOn: "2026-08-31", note: null }],
        "2026-08-10",
      ),
    ).toBe("current");
  });

  it("returns permanent when no periods exist", () => {
    expect(getAvailabilityState([], "2026-08-10")).toBe("permanent");
  });
});

describe("filterRestaurants", () => {
  it("excludes an ended popup by default", () => {
    expect(
      filterRestaurants(
        [endedPopup],
        { includeEndedPopups: false },
        "2026-08-10",
      ),
    ).toEqual([]);
  });

  it("reveals an ended popup when explicitly included", () => {
    expect(
      filterRestaurants(
        [endedPopup],
        { includeEndedPopups: true },
        "2026-08-10",
      ),
    ).toEqual([endedPopup]);
  });
});
