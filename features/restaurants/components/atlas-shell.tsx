"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { StampBadge } from "@/components/ui/stamp-badge";
import { getPublicEnv } from "@/lib/env/public";

import { filterRestaurants } from "../filters";
import {
  serializeAtlasUrlState,
  type AtlasMobileView,
  type AtlasUrlState,
} from "../atlas-url-state";
import type { RestaurantDetail as RestaurantDetailData } from "../types";
import { RestaurantDetail } from "./restaurant-detail";
import { RestaurantFilters } from "./restaurant-filters";
import { RestaurantList } from "./restaurant-list";
import { RestaurantMap } from "./restaurant-map";

type AtlasShellProps = {
  currentDate: string;
  initialState: AtlasUrlState;
  restaurants: RestaurantDetailData[];
};

function readKakaoMapAppKey(): string {
  try {
    return getPublicEnv().kakaoMapAppKey;
  } catch {
    return "";
  }
}

export function AtlasShell({
  currentDate,
  initialState,
  restaurants,
}: AtlasShellProps) {
  const router = useRouter();
  const [atlasState, setAtlasState] = useState(initialState);
  const initialUrlState = serializeAtlasUrlState(initialState);
  const [previousInitialUrlState, setPreviousInitialUrlState] =
    useState(initialUrlState);

  if (previousInitialUrlState !== initialUrlState) {
    setPreviousInitialUrlState(initialUrlState);
    setAtlasState(initialState);
  }

  const updateAtlasState = useCallback(
    (nextState: AtlasUrlState) => {
      const query = serializeAtlasUrlState(nextState);
      setAtlasState(nextState);
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router],
  );
  const kakaoMapAppKey = readKakaoMapAppKey();
  const filteredRestaurants = useMemo(
    () => filterRestaurants(restaurants, atlasState.filter, currentDate),
    [atlasState.filter, currentDate, restaurants],
  );
  const selectedRestaurant = filteredRestaurants.find(
    (restaurant) => restaurant.slug === atlasState.selectedRestaurantSlug,
  );
  const visibleSelectedRestaurantId = selectedRestaurant?.id ?? null;
  const handleSelect = useCallback(
    (restaurantId: string) => {
      const restaurant = restaurants.find(({ id }) => id === restaurantId);

      if (!restaurant) {
        return;
      }

      updateAtlasState({
        ...atlasState,
        selectedRestaurantSlug: restaurant.slug,
      });
    },
    [atlasState, restaurants, updateAtlasState],
  );
  const handleFilterChange = useCallback(
    (filter: AtlasUrlState["filter"]) => {
      updateAtlasState({
        ...atlasState,
        filter,
        selectedRestaurantSlug: null,
      });
    },
    [atlasState, updateAtlasState],
  );
  const handleMobileViewChange = useCallback(
    (mobileView: AtlasMobileView) => {
      updateAtlasState({ ...atlasState, mobileView });
    },
    [atlasState, updateAtlasState],
  );
  const clearSelectedRestaurant = useCallback(() => {
    updateAtlasState({ ...atlasState, selectedRestaurantSlug: null });
  }, [atlasState, updateAtlasState]);
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
            <br className="atlas-hero__line-break" /> 다음 한 판을 위하여
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
        <RestaurantFilters
          filter={atlasState.filter}
          onChange={handleFilterChange}
        />
        <div className="atlas-mobile-toggle">
          <SegmentedControl
            ariaLabel="맛집 보기 방식"
            onChange={handleMobileViewChange}
            options={[
              { label: "지도", value: "map" },
              { label: "목록", value: "list" },
            ]}
            value={atlasState.mobileView}
          />
        </div>
      </div>

      <div className="atlas-layout">
        <section
          aria-label="맛집 지도"
          className="atlas-map-panel"
          data-mobile-active={atlasState.mobileView === "map"}
        >
          <div aria-hidden="true" className="atlas-map-panel__label">
            KAKAO MAP · VERIFIED PINS
          </div>
          <RestaurantMap
            appKey={kakaoMapAppKey}
            isVisible={atlasState.mobileView === "map"}
            onSelect={handleSelect}
            restaurants={filteredRestaurants}
            selectedRestaurantId={visibleSelectedRestaurantId}
          />
          {selectedRestaurant ? (
            <div className="mobile-restaurant-sheet">
              <button
                aria-label="선택한 맛집 닫기"
                onClick={clearSelectedRestaurant}
                type="button"
              >
                ×
              </button>
              <span>{selectedRestaurant.region}</span>
              <strong>{selectedRestaurant.name}</strong>
              <Link
                href={`/restaurants/${encodeURIComponent(selectedRestaurant.slug)}`}
              >
                상세 보기 →
              </Link>
            </div>
          ) : null}
        </section>
        <aside
          className="atlas-list-panel"
          data-mobile-active={atlasState.mobileView === "list"}
        >
          {selectedRestaurant ? (
            <RestaurantDetail
              currentDate={currentDate}
              onBack={clearSelectedRestaurant}
              restaurant={selectedRestaurant}
              variant="panel"
            />
          ) : (
            <RestaurantList
              currentDate={currentDate}
              onSelect={handleSelect}
              restaurants={filteredRestaurants}
              selectedRestaurantId={visibleSelectedRestaurantId}
              totalCount={restaurants.length}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
