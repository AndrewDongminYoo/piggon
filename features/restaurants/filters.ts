import type {
  AvailabilityPeriod,
  AvailabilityState,
  RestaurantFilter,
  RestaurantSummary,
} from "./types";

export function getAvailabilityState(
  periods: AvailabilityPeriod[],
  currentDate: string,
): AvailabilityState {
  if (periods.length === 0) {
    return "permanent";
  }

  if (
    periods.some(
      ({ endsOn, startsOn }) =>
        startsOn <= currentDate && (endsOn === null || currentDate <= endsOn),
    )
  ) {
    return "current";
  }

  if (periods.some(({ startsOn }) => currentDate < startsOn)) {
    return "upcoming";
  }

  return "ended";
}

function hasAvpnCertification(restaurant: RestaurantSummary): boolean {
  return restaurant.certifications.some(({ issuer, name }) =>
    `${issuer} ${name}`.toLowerCase().includes("avpn"),
  );
}

function matchesSearch(restaurant: RestaurantSummary, search: string): boolean {
  const normalizedSearch = search.trim().toLocaleLowerCase("ko-KR");

  if (!normalizedSearch) {
    return true;
  }

  return [
    restaurant.name,
    restaurant.alternateName,
    restaurant.region,
    restaurant.address,
  ]
    .filter((value): value is string => value !== null)
    .some((value) =>
      value.toLocaleLowerCase("ko-KR").includes(normalizedSearch),
    );
}

export function filterRestaurants(
  restaurants: RestaurantSummary[],
  filter: RestaurantFilter,
  currentDate: string,
): RestaurantSummary[] {
  return restaurants.filter((restaurant) => {
    const availability = getAvailabilityState(
      restaurant.availabilityPeriods,
      currentDate,
    );

    if (
      restaurant.kind === "popup" &&
      availability === "ended" &&
      !filter.includeEndedPopups
    ) {
      return false;
    }

    if (filter.search && !matchesSearch(restaurant, filter.search)) {
      return false;
    }

    if (filter.hasVideo && restaurant.videos.length === 0) {
      return false;
    }

    if (filter.hasAvpnCertification && !hasAvpnCertification(restaurant)) {
      return false;
    }

    if (filter.hasAward && restaurant.awards.length === 0) {
      return false;
    }

    if (
      filter.currentAvailabilityOnly &&
      !["current", "permanent"].includes(availability)
    ) {
      return false;
    }

    return true;
  });
}
