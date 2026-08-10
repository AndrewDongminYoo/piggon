import type { RestaurantFilter } from "../types";

type RestaurantFiltersProps = {
  filter: RestaurantFilter;
  onChange: (filter: RestaurantFilter) => void;
};

const FILTER_OPTIONS: Array<{
  key: Exclude<keyof RestaurantFilter, "search">;
  label: string;
}> = [
  { key: "hasVideo", label: "피자꼰대 영상" },
  { key: "hasAvpnCertification", label: "AVPN 인증" },
  { key: "hasAward", label: "대회 수상" },
  { key: "currentAvailabilityOnly", label: "지금 방문 가능" },
  { key: "includeEndedPopups", label: "종료된 팝업 포함" },
];

export function RestaurantFilters({
  filter,
  onChange,
}: RestaurantFiltersProps) {
  const hasActiveFilter = Boolean(
    filter.search || FILTER_OPTIONS.some(({ key }) => Boolean(filter[key])),
  );

  return (
    <section aria-label="맛집 검색 및 필터" className="restaurant-filters">
      <label className="atlas-search">
        <span className="atlas-search__label">맛집 찾기</span>
        <span className="atlas-search__field">
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) =>
              onChange({ ...filter, search: event.target.value })
            }
            placeholder="이름, 지역, 주소로 검색"
            type="search"
            value={filter.search ?? ""}
          />
        </span>
      </label>
      <div className="filter-stamps">
        {FILTER_OPTIONS.map((option) => (
          <label className="filter-stamp" key={option.key}>
            <input
              checked={Boolean(filter[option.key])}
              onChange={(event) =>
                onChange({ ...filter, [option.key]: event.target.checked })
              }
              type="checkbox"
            />
            <span>{option.label}</span>
          </label>
        ))}
        {hasActiveFilter ? (
          <button
            className="filter-reset"
            onClick={() => onChange({ includeEndedPopups: false })}
            type="button"
          >
            초기화
          </button>
        ) : null}
      </div>
    </section>
  );
}
