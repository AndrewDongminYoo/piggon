"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "../kakao-maps";

export type KakaoPlaceSelection = {
  address: string;
  kakaoPlaceId: string;
  latitude: number;
  longitude: number;
  name: string;
  sourceUrl: string;
};

type KakaoPlacePickerProps = {
  appKey: string;
  onChange: (selection: KakaoPlaceSelection) => void;
  value: KakaoPlaceSelection | null;
};

function normalizePlaceUrl(value: string): string {
  const url = new URL(value);
  url.protocol = "https:";
  return url.toString();
}

export function KakaoPlacePicker({
  appKey,
  onChange,
  value,
}: KakaoPlacePickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty">(
    "idle",
  );

  function searchPlaces(): void {
    const keyword = query.trim();
    if (!keyword) {
      setStatus("empty");
      return;
    }

    const sequence = searchSequence.current + 1;
    searchSequence.current = sequence;
    setStatus("loading");
    loadKakaoMaps(appKey)
      .then((maps) => {
        const places = new maps.services.Places();
        places.keywordSearch(keyword, (nextResults, nextStatus) => {
          if (sequence !== searchSequence.current) {
            return;
          }

          if (nextStatus !== maps.services.Status.OK) {
            setResults([]);
            setStatus("empty");
            return;
          }

          setResults(nextResults);
          setStatus("idle");
        });
      })
      .catch(() => {
        if (sequence === searchSequence.current) {
          setStatus("error");
        }
      });
  }

  useEffect(() => {
    const container = mapRef.current;
    if (!container || !value || !appKey) {
      return;
    }

    let disposed = false;
    let marker: KakaoMarker | null = null;
    let mapsApi: KakaoMapsApi | null = null;
    let handleDragEnd: (() => void) | null = null;

    loadKakaoMaps(appKey)
      .then((maps) => {
        if (disposed) {
          return;
        }

        const position = new maps.LatLng(value.latitude, value.longitude);
        const map = new maps.Map(container, { center: position, level: 3 });
        const nextMarker = new maps.Marker({
          draggable: true,
          map,
          position,
        });
        const nextHandleDragEnd = () => {
          const nextPosition = nextMarker.getPosition();
          onChange({
            ...value,
            latitude: nextPosition.getLat(),
            longitude: nextPosition.getLng(),
          });
        };

        marker = nextMarker;
        mapsApi = maps;
        handleDragEnd = nextHandleDragEnd;
        maps.event.addListener(nextMarker, "dragend", nextHandleDragEnd);
      })
      .catch(() => setStatus("error"));

    return () => {
      disposed = true;
      if (marker && mapsApi && handleDragEnd) {
        mapsApi.event.removeListener(marker, "dragend", handleDragEnd);
        marker.setMap(null);
      }
    };
  }, [appKey, onChange, value]);

  if (!appKey) {
    return (
      <p className="admin-place-picker__notice">
        Kakao JavaScript 키를 설정하면 장소 검색을 사용할 수 있습니다.
      </p>
    );
  }

  return (
    <section className="admin-place-picker">
      <div className="admin-place-picker__search">
        <label htmlFor="kakao-place-query">Kakao 장소 검색</label>
        <div>
          <input
            id="kakao-place-query"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchPlaces();
              }
            }}
            placeholder="상호명과 지역을 함께 검색"
            type="search"
            value={query}
          />
          <button onClick={searchPlaces} type="button">
            {status === "loading" ? "검색 중…" : "장소 찾기"}
          </button>
        </div>
      </div>

      {status === "error" ? (
        <p className="admin-place-picker__notice" role="alert">
          Kakao 장소 검색을 불러오지 못했습니다.
        </p>
      ) : null}
      {status === "empty" ? (
        <p className="admin-place-picker__notice">검색 결과가 없습니다.</p>
      ) : null}

      {results.length > 0 ? (
        <div className="admin-place-results">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() =>
                onChange({
                  address: result.road_address_name || result.address_name,
                  kakaoPlaceId: result.id,
                  latitude: Number(result.y),
                  longitude: Number(result.x),
                  name: result.place_name,
                  sourceUrl: normalizePlaceUrl(result.place_url),
                })
              }
              type="button"
            >
              <strong>{result.place_name}</strong>
              <span>{result.road_address_name || result.address_name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {value ? (
        <div className="admin-place-selection">
          <div>
            <strong>{value.name}</strong>
            <span>{value.address}</span>
            <small>마커를 끌어 정확한 입구 위치를 조정할 수 있습니다.</small>
          </div>
          <div
            aria-label="선택한 Kakao 장소 위치"
            className="admin-place-map"
            ref={mapRef}
            role="region"
          />
        </div>
      ) : null}
    </section>
  );
}
