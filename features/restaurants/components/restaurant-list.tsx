import type { RestaurantSummary } from "../types";
import { RestaurantCard } from "./restaurant-card";

type RestaurantListProps = {
  currentDate: string;
  onSelect: (restaurantId: string) => void;
  restaurants: RestaurantSummary[];
  selectedRestaurantId: string | null;
  totalCount: number;
};

export function RestaurantList({
  currentDate,
  onSelect,
  restaurants,
  selectedRestaurantId,
  totalCount,
}: RestaurantListProps) {
  return (
    <section
      aria-labelledby="restaurant-list-title"
      className="restaurant-list"
    >
      <header className="restaurant-list__header">
        <div>
          <span>CURATED INDEX</span>
          <h2 id="restaurant-list-title">피자 원정 목록</h2>
        </div>
        <strong aria-label={`${restaurants.length}개 검색 결과`}>
          {restaurants.length}
        </strong>
      </header>
      {restaurants.length > 0 ? (
        <ol className="restaurant-list__items">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id}>
              <RestaurantCard
                currentDate={currentDate}
                isSelected={restaurant.id === selectedRestaurantId}
                onSelect={onSelect}
                restaurant={restaurant}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="restaurant-list__empty">
          <span aria-hidden="true">□</span>
          <strong>
            {totalCount === 0
              ? "공개할 맛집을 검증하고 있습니다"
              : "조건에 맞는 맛집이 없습니다"}
          </strong>
          <p>
            {totalCount === 0
              ? "정확한 위치와 근거를 확인한 맛집부터 차례로 지도에 올릴게요."
              : "검색어나 필터를 줄이면 다시 나타납니다."}
          </p>
        </div>
      )}
    </section>
  );
}
