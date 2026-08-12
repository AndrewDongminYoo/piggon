import { describe, expect, it } from "vitest";

import { parseAtlasUrlState, serializeAtlasUrlState } from "./atlas-url-state";

describe("atlas URL state", () => {
  it("restores shared filters, the mobile view, and a selected restaurant", () => {
    expect(
      parseAtlasUrlState({
        avpn: "1",
        past: "1",
        q: "성수 피자",
        restaurant: "marione-seongsu",
        video: "1",
        view: "list",
      }),
    ).toEqual({
      filter: {
        hasAvpnCertification: true,
        hasVideo: true,
        includeEndedPopups: true,
        search: "성수 피자",
      },
      mobileView: "list",
      selectedRestaurantSlug: "marione-seongsu",
    });
  });

  it("omits defaults while producing a stable shareable query string", () => {
    expect(
      serializeAtlasUrlState({
        filter: {
          currentAvailabilityOnly: true,
          hasAward: true,
          includeEndedPopups: false,
          search: "",
        },
        mobileView: "map",
        selectedRestaurantSlug: null,
      }),
    ).toBe("award=1&open=1");
  });
});
