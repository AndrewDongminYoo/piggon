"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { loadKakaoMaps } from "../kakao-maps";
import type { RestaurantSummary } from "../types";
import { MapFallback } from "./map-fallback";

type RestaurantMapProps = {
  appKey: string;
  isVisible: boolean;
  onSelect: (restaurantId: string) => void;
  restaurants: RestaurantSummary[];
  selectedRestaurantId: string | null;
};

type MapStatus = "loading" | "ready" | "error";

export function RestaurantMap({
  appKey,
  isVisible,
  onSelect,
  restaurants,
  selectedRestaurantId,
}: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<KakaoMap | null>(null);
  const [mapsApi, setMapsApi] = useState<KakaoMapsApi | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [status, setStatus] = useState<MapStatus>("loading");
  const mappableRestaurants = useMemo(
    () =>
      restaurants.filter(
        (restaurant) =>
          restaurant.latitude !== null && restaurant.longitude !== null,
      ),
    [restaurants],
  );
  const hasMappableRestaurants = mappableRestaurants.length > 0;

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !appKey || !hasMappableRestaurants) {
      return;
    }

    let cancelled = false;

    loadKakaoMaps(appKey)
      .then((loadedMaps) => {
        if (cancelled) {
          return;
        }

        const center = new loadedMaps.LatLng(37.566826, 126.9786567);
        const nextMap = new loadedMaps.Map(container, { center, level: 8 });
        setMapsApi(loadedMaps);
        setMap(nextMap);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appKey, hasMappableRestaurants, retryToken]);

  useEffect(() => {
    if (!map || !mapsApi || !hasMappableRestaurants) {
      return;
    }

    const bounds = new mapsApi.LatLngBounds();
    const overlays = mappableRestaurants.map((restaurant) => {
      const position = new mapsApi.LatLng(
        restaurant.latitude as number,
        restaurant.longitude as number,
      );
      const marker = document.createElement("button");
      const dot = document.createElement("span");
      const label = document.createElement("span");
      const selectRestaurant = () => onSelect(restaurant.id);

      marker.type = "button";
      marker.className = "kakao-marker";
      marker.classList.toggle(
        "kakao-marker--selected",
        restaurant.id === selectedRestaurantId,
      );
      marker.setAttribute("aria-label", `${restaurant.name} 선택`);
      marker.setAttribute(
        "aria-pressed",
        String(restaurant.id === selectedRestaurantId),
      );
      dot.className = "kakao-marker__dot";
      dot.setAttribute("aria-hidden", "true");
      label.className = "kakao-marker__label";
      label.textContent = restaurant.name;
      marker.append(dot, label);
      marker.addEventListener("click", selectRestaurant);

      const overlay = new mapsApi.CustomOverlay({
        clickable: true,
        content: marker,
        map,
        position,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: restaurant.id === selectedRestaurantId ? 10 : 1,
      });

      bounds.extend(position);

      return { marker, overlay, selectRestaurant };
    });

    map.setBounds(bounds);

    return () => {
      overlays.forEach(({ marker, overlay, selectRestaurant }) => {
        marker.removeEventListener("click", selectRestaurant);
        overlay.setMap(null);
      });
    };
  }, [
    hasMappableRestaurants,
    map,
    mapsApi,
    mappableRestaurants,
    onSelect,
    selectedRestaurantId,
  ]);

  useEffect(() => {
    if (!isVisible || !map || !mapsApi) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      map.relayout();
      const selected = mappableRestaurants.find(
        (restaurant) => restaurant.id === selectedRestaurantId,
      );

      if (selected) {
        map.panTo(
          new mapsApi.LatLng(
            selected.latitude as number,
            selected.longitude as number,
          ),
        );
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, map, mapsApi, mappableRestaurants, selectedRestaurantId]);

  if (!appKey) {
    return (
      <MapFallback
        description="맛집 목록은 그대로 둘러볼 수 있습니다. 배포 환경의 지도 키를 확인해 주세요."
        title="지도 설정을 준비 중입니다"
      />
    );
  }

  if (!hasMappableRestaurants) {
    return (
      <MapFallback
        description="검증된 좌표가 등록되면 이곳에 피자 지도가 펼쳐집니다. 목록은 계속 이용할 수 있습니다."
        title="지도 위치를 검증하고 있습니다"
      />
    );
  }

  if (status === "error") {
    return (
      <MapFallback
        description="지도만 잠시 쉬고 있어요. 검색과 맛집 목록은 정상적으로 이용할 수 있습니다."
        onRetry={() => {
          setStatus("loading");
          setRetryToken((value) => value + 1);
        }}
        title="카카오 지도를 불러오지 못했습니다"
      />
    );
  }

  return (
    <div className="restaurant-map-frame">
      {status === "loading" ? (
        <div className="map-loading" role="status">
          피자 지도를 펼치는 중…
        </div>
      ) : null}
      <div
        aria-label="맛집 위치 지도"
        className="restaurant-map-canvas"
        ref={containerRef}
        role="region"
      />
    </div>
  );
}
