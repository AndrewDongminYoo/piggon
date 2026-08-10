"use client";

import { useCallback, useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { StampBadge } from "@/components/ui/stamp-badge";
import { getPublicEnv } from "@/lib/env/public";

import { filterRestaurants } from "../filters";
import type { RestaurantFilter, RestaurantSummary } from "../types";
import { RestaurantFilters } from "./restaurant-filters";
import { RestaurantList } from "./restaurant-list";
import { RestaurantMap } from "./restaurant-map";

type AtlasShellProps = {
  currentDate: string;
  restaurants: RestaurantSummary[];
};

type MobileView = "map" | "list";

function readKakaoMapAppKey(): string {
  try {
    return getPublicEnv().kakaoMapAppKey;
  } catch {
    return "";
  }
}

export function AtlasShell({ currentDate, restaurants }: AtlasShellProps) {
  const [filter, setFilter] = useState<RestaurantFilter>({
    includeEndedPopups: false,
  });
  const [mobileView, setMobileView] = useState<MobileView>("map");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const kakaoMapAppKey = readKakaoMapAppKey();
  const filteredRestaurants = useMemo(
    () => filterRestaurants(restaurants, filter, currentDate),
    [currentDate, filter, restaurants],
  );
  const visibleSelectedRestaurantId = filteredRestaurants.some(
    (restaurant) => restaurant.id === selectedRestaurantId,
  )
    ? selectedRestaurantId
    : null;
  const handleSelect = useCallback((restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
  }, []);
  const videoRestaurantCount = restaurants.filter(
    (restaurant) => restaurant.videos.length > 0,
  ).length;
  const mappedRestaurantCount = restaurants.filter(
    (restaurant) =>
      restaurant.latitude !== null && restaurant.longitude !== null,
  ).length;

  return (
    <main className="atlas-page">
      <section className="atlas-hero">
        <div>
          <StampBadge tone="tomato">UNOFFICIAL PIZZA ATLAS</StampBadge>
          <h1>
            피자에 진심인 사람들의
            <br />
            다음 한 판을 위하여
          </h1>
          <p>
            피자꼰대 영상 속 맛집부터 인증과 수상 이력이 확인된 피자집까지,
            근거를 확인한 장소만 한 장의 지도에 모읍니다.
          </p>
        </div>
        <dl className="atlas-stats">
          <div>
            <dt>공개 맛집</dt>
            <dd>{restaurants.length}</dd>
          </div>
          <div>
            <dt>영상 연결</dt>
            <dd>{videoRestaurantCount}</dd>
          </div>
          <div>
            <dt>지도 좌표</dt>
            <dd>{mappedRestaurantCount}</dd>
          </div>
        </dl>
      </section>

      <div className="atlas-filter-dock">
        <RestaurantFilters filter={filter} onChange={setFilter} />
        <div className="atlas-mobile-toggle">
          <SegmentedControl
            ariaLabel="맛집 보기 방식"
            onChange={setMobileView}
            options={[
              { label: "지도", value: "map" },
              { label: "목록", value: "list" },
            ]}
            value={mobileView}
          />
        </div>
      </div>

      <div className="atlas-layout">
        <section
          aria-label="맛집 지도"
          className="atlas-map-panel"
          data-mobile-active={mobileView === "map"}
        >
          <div aria-hidden="true" className="atlas-map-panel__label">
            KAKAO MAP · VERIFIED PINS
          </div>
          <RestaurantMap
            appKey={kakaoMapAppKey}
            isVisible={mobileView === "map"}
            onSelect={handleSelect}
            restaurants={filteredRestaurants}
            selectedRestaurantId={visibleSelectedRestaurantId}
          />
        </section>
        <aside
          className="atlas-list-panel"
          data-mobile-active={mobileView === "list"}
        >
          <RestaurantList
            currentDate={currentDate}
            onSelect={handleSelect}
            restaurants={filteredRestaurants}
            selectedRestaurantId={visibleSelectedRestaurantId}
            totalCount={restaurants.length}
          />
        </aside>
      </div>
    </main>
  );
}
