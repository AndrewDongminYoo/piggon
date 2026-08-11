import { getAvailabilityState } from "../filters";
import type { RestaurantSummary } from "../types";

type RestaurantCardProps = {
  currentDate: string;
  isSelected: boolean;
  onSelect: (restaurantId: string) => void;
  restaurant: RestaurantSummary;
};

const KIND_LABELS: Record<RestaurantSummary["kind"], string> = {
  franchise: "프랜차이즈",
  pizzeria: "피제리아",
  popup: "팝업",
  restaurant: "레스토랑",
};

const AVAILABILITY_LABELS = {
  current: "지금 방문 가능",
  ended: "종료된 팝업",
  permanent: "상시 매장",
  upcoming: "오픈 예정",
} as const;

function hasAvpnCertification(restaurant: RestaurantSummary): boolean {
  return restaurant.certifications.some(({ issuer, name }) =>
    `${issuer} ${name}`.toLowerCase().includes("avpn"),
  );
}

export function RestaurantCard({
  currentDate,
  isSelected,
  onSelect,
  restaurant,
}: RestaurantCardProps) {
  const availability = getAvailabilityState(
    restaurant.availabilityPeriods,
    currentDate,
  );
  const hasCoordinates =
    restaurant.latitude !== null && restaurant.longitude !== null;

  return (
    <article
      className={`restaurant-card ${isSelected ? "restaurant-card--selected" : ""}`.trim()}
    >
      <button
        aria-pressed={isSelected}
        className="restaurant-card__button"
        onClick={() => onSelect(restaurant.id)}
        type="button"
      >
        <span aria-hidden="true" className="restaurant-card__index">
          {restaurant.name.slice(0, 1)}
        </span>
        <span className="restaurant-card__body">
          <span className="restaurant-card__heading">
            <strong>{restaurant.name}</strong>
            <small>{KIND_LABELS[restaurant.kind]}</small>
          </span>
          {restaurant.alternateName ? (
            <span className="restaurant-card__alternate">
              {restaurant.alternateName}
            </span>
          ) : null}
          <span className="restaurant-card__address">
            {restaurant.address ?? restaurant.region}
          </span>
          <span className="restaurant-card__badges">
            {restaurant.videos.length > 0 ? (
              <span className="mini-stamp mini-stamp--tomato">
                영상 {restaurant.videos.length}
              </span>
            ) : null}
            {hasAvpnCertification(restaurant) ? (
              <span className="mini-stamp mini-stamp--basil">AVPN</span>
            ) : null}
            {restaurant.awards.length > 0 ? (
              <span className="mini-stamp">대회 수상</span>
            ) : null}
            <span className="mini-stamp">
              {AVAILABILITY_LABELS[availability]}
            </span>
          </span>
          <span className="restaurant-card__map-state">
            {hasCoordinates ? "지도에서 찾기 →" : "지도 위치 검증 중"}
          </span>
        </span>
      </button>
    </article>
  );
}
