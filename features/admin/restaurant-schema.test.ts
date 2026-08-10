import { describe, expect, it } from "vitest";

import { restaurantAdminSchema } from "./restaurant-schema";

const baseRestaurant = {
  address: "서울 성동구 성수이로 1",
  alternateName: "",
  availabilityPeriods: [],
  awards: [],
  certifications: [],
  description: "",
  id: "",
  intent: "draft",
  kakaoPlaceId: "",
  kind: "pizzeria",
  latitude: "37.5445",
  longitude: "127.0560",
  name: "마리오네",
  region: "서울 성동구",
  slug: "marione",
  sourceUrl: "https://example.com/marione",
};

describe("restaurantAdminSchema", () => {
  it("accepts a minimal draft", () => {
    expect(
      restaurantAdminSchema.parse({
        ...baseRestaurant,
        address: "",
        latitude: "",
        longitude: "",
        sourceUrl: "",
      }).intent,
    ).toBe("draft");
  });

  it("rejects publishing a restaurant without coordinates", () => {
    expect(() =>
      restaurantAdminSchema.parse({
        ...baseRestaurant,
        intent: "publish",
        latitude: "",
        longitude: "",
      }),
    ).toThrow();
  });

  it("requires an availability period when publishing a popup", () => {
    expect(() =>
      restaurantAdminSchema.parse({
        ...baseRestaurant,
        intent: "publish",
        kind: "popup",
      }),
    ).toThrow();
  });

  it("requires HTTPS evidence for certifications and awards", () => {
    expect(() =>
      restaurantAdminSchema.parse({
        ...baseRestaurant,
        awards: [
          {
            awardYear: 2026,
            competitionName: "Caputo Cup",
            division: "STG",
            placement: "1위",
            sourceUrl: "http://example.com/award",
          },
        ],
        certifications: [
          {
            certificationNumber: "123",
            issuer: "AVPN",
            name: "Vera Pizza Napoletana",
            sourceUrl: "https://example.com/certification",
            validFrom: "2026-01-01",
            validUntil: "",
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts a publishable popup with sourced attributes", () => {
    const result = restaurantAdminSchema.parse({
      ...baseRestaurant,
      availabilityPeriods: [
        {
          endsOn: "2026-08-31",
          note: "여름 팝업",
          startsOn: "2026-08-01",
        },
      ],
      awards: [
        {
          awardYear: 2026,
          competitionName: "Caputo Cup",
          division: "STG",
          placement: "1위",
          sourceUrl: "https://example.com/award",
        },
      ],
      certifications: [
        {
          certificationNumber: "123",
          issuer: "AVPN",
          name: "Vera Pizza Napoletana",
          sourceUrl: "https://example.com/certification",
          validFrom: "2026-01-01",
          validUntil: "",
        },
      ],
      intent: "publish",
      kind: "popup",
    });

    expect(result.availabilityPeriods).toHaveLength(1);
    expect(result.latitude).toBe(37.5445);
  });
});
