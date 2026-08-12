import type { RestaurantFilter } from "./types";

type AtlasSearchParams = Record<string, string | string[] | undefined>;

export type AtlasMobileView = "map" | "list";

export type AtlasUrlState = {
  filter: RestaurantFilter;
  mobileView: AtlasMobileView;
  selectedRestaurantSlug: string | null;
};

function readSearchParam(
  searchParams: AtlasSearchParams,
  key: string,
): string | undefined {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function isEnabled(searchParams: AtlasSearchParams, key: string): boolean {
  return readSearchParam(searchParams, key) === "1";
}

export function parseAtlasUrlState(
  searchParams: AtlasSearchParams,
): AtlasUrlState {
  const search = readSearchParam(searchParams, "q")?.trim();
  const selectedRestaurantSlug = readSearchParam(searchParams, "restaurant");

  return {
    filter: {
      ...(search ? { search } : {}),
      ...(isEnabled(searchParams, "video") ? { hasVideo: true } : {}),
      ...(isEnabled(searchParams, "avpn")
        ? { hasAvpnCertification: true }
        : {}),
      ...(isEnabled(searchParams, "award") ? { hasAward: true } : {}),
      ...(isEnabled(searchParams, "open")
        ? { currentAvailabilityOnly: true }
        : {}),
      ...(isEnabled(searchParams, "past") ? { includeEndedPopups: true } : {}),
    },
    mobileView:
      readSearchParam(searchParams, "view") === "list" ? "list" : "map",
    selectedRestaurantSlug: selectedRestaurantSlug || null,
  };
}

export function serializeAtlasUrlState(state: AtlasUrlState): string {
  const searchParams = new URLSearchParams();
  const { filter } = state;

  if (filter.search?.trim()) {
    searchParams.set("q", filter.search.trim());
  }
  if (filter.hasVideo) {
    searchParams.set("video", "1");
  }
  if (filter.hasAvpnCertification) {
    searchParams.set("avpn", "1");
  }
  if (filter.hasAward) {
    searchParams.set("award", "1");
  }
  if (filter.currentAvailabilityOnly) {
    searchParams.set("open", "1");
  }
  if (filter.includeEndedPopups) {
    searchParams.set("past", "1");
  }
  if (state.mobileView === "list") {
    searchParams.set("view", "list");
  }
  if (state.selectedRestaurantSlug) {
    searchParams.set("restaurant", state.selectedRestaurantSlug);
  }

  return searchParams.toString();
}
