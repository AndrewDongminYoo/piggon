import type { ReactNode } from "react";

import { StampBadge } from "@/components/ui/stamp-badge";
import { ReviewList } from "@/features/visits/components/review-list";
import type { PublicVisit } from "@/features/visits/queries";

import { getAvailabilityState } from "../filters";
import type {
  AvailabilityPeriod,
  AvailabilityState,
  RestaurantDetail as RestaurantDetailData,
} from "../types";
import { DetailActions } from "./detail-actions";
import { VideoCard } from "./video-card";

type RestaurantDetailProps = {
  community?: PublicVisit[];
  currentDate: string;
  onBack?: () => void;
  restaurant: RestaurantDetailData;
  variant?: "page" | "panel";
  visitContribution?: ReactNode;
};

const AVAILABILITY_COPY: Record<
  AvailabilityState,
  { description: string; label: string }
> = {
  current: {
    description: "등록된 운영 기간을 기준으로 지금 방문할 수 있습니다.",
    label: "지금 방문 가능",
  },
  ended: {
    description: "운영 기간이 끝난 팝업입니다. 방문 기록과 영상은 남겨둡니다.",
    label: "운영 종료",
  },
  permanent: {
    description: "별도의 한정 운영 기간이 없는 상시 매장입니다.",
    label: "상시 매장",
  },
  upcoming: {
    description: "등록된 운영 시작일 이후 방문할 수 있습니다.",
    label: "오픈 예정",
  },
};

function findRelevantPeriod(
  periods: AvailabilityPeriod[],
  availability: AvailabilityState,
  currentDate: string,
): AvailabilityPeriod | null {
  if (availability === "current") {
    return (
      periods.find(
        ({ endsOn, startsOn }) =>
          startsOn <= currentDate && (endsOn === null || currentDate <= endsOn),
      ) ?? null
    );
  }

  if (availability === "upcoming") {
    return (
      periods
        .filter(({ startsOn }) => currentDate < startsOn)
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0] ?? null
    );
  }

  if (availability === "ended") {
    return (
      [...periods].sort((a, b) =>
        (b.endsOn ?? b.startsOn).localeCompare(a.endsOn ?? a.startsOn),
      )[0] ?? null
    );
  }

  return null;
}

function getSafeHttpsUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function RestaurantDetail({
  community,
  currentDate,
  onBack,
  restaurant,
  variant = "page",
  visitContribution,
}: RestaurantDetailProps) {
  const availability = getAvailabilityState(
    restaurant.availabilityPeriods,
    currentDate,
  );
  const availabilityCopy = AVAILABILITY_COPY[availability];
  const relevantPeriod = findRelevantPeriod(
    restaurant.availabilityPeriods,
    availability,
    currentDate,
  );
  const sourceUrl = getSafeHttpsUrl(restaurant.sourceUrl);
  const Title = variant === "page" ? "h1" : "h2";
  const SectionTitle = variant === "page" ? "h2" : "h3";

  return (
    <article className={`restaurant-detail restaurant-detail--${variant}`}>
      <header className="restaurant-detail__header">
        <DetailActions onBack={onBack} restaurantSlug={restaurant.slug} />
        <StampBadge tone="tomato">PIZZA FIELD NOTE</StampBadge>
        <Title>{restaurant.name}</Title>
        {restaurant.alternateName ? (
          <p className="restaurant-detail__alternate">
            {restaurant.alternateName}
          </p>
        ) : null}
        {restaurant.description ? (
          <p className="restaurant-detail__description">
            {restaurant.description}
          </p>
        ) : null}
      </header>

      <section
        className={`detail-section detail-availability detail-availability--${availability}`}
      >
        <div>
          <span>AVAILABILITY</span>
          <SectionTitle>{availabilityCopy.label}</SectionTitle>
        </div>
        <p>{relevantPeriod?.note ?? availabilityCopy.description}</p>
        {relevantPeriod ? (
          <small>
            {relevantPeriod.startsOn} — {relevantPeriod.endsOn ?? "종료일 미정"}
          </small>
        ) : null}
      </section>

      <section className="detail-section">
        <span>LOCATION</span>
        <SectionTitle>어디에서 먹나요?</SectionTitle>
        <p className="detail-address">
          {restaurant.address ?? restaurant.region}
        </p>
        {sourceUrl ? (
          <a
            className="detail-source-link"
            href={sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            기본 정보 출처 확인 ↗
          </a>
        ) : null}
      </section>

      {restaurant.certifications.length > 0 ? (
        <section className="detail-section">
          <span>CERTIFICATION</span>
          <SectionTitle>확인된 인증</SectionTitle>
          <div className="detail-claims">
            {restaurant.certifications.map((certification) => {
              const certificationSourceUrl = getSafeHttpsUrl(
                certification.sourceUrl,
              );

              return (
                <article
                  className="detail-claim"
                  key={`${certification.issuer}-${certification.name}`}
                >
                  <strong>{certification.name}</strong>
                  <p>{certification.issuer}</p>
                  {certification.certificationNumber ? (
                    <small>No. {certification.certificationNumber}</small>
                  ) : null}
                  {certificationSourceUrl ? (
                    <a
                      href={certificationSourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      인증 근거 ↗
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {restaurant.awards.length > 0 ? (
        <section className="detail-section">
          <span>COMPETITION</span>
          <SectionTitle>대회 수상 이력</SectionTitle>
          <div className="detail-claims">
            {restaurant.awards.map((award) => {
              const awardSourceUrl = getSafeHttpsUrl(award.sourceUrl);

              return (
                <article
                  className="detail-claim"
                  key={`${award.competitionName}-${award.awardYear}-${award.division}`}
                >
                  <strong>
                    {award.awardYear} {award.competitionName}
                  </strong>
                  <p>
                    {award.division} · {award.placement}
                  </p>
                  {awardSourceUrl ? (
                    <a
                      href={awardSourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      수상 근거 ↗
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {restaurant.videos.length > 0 ? (
        <section className="detail-section">
          <span>ON THE CHANNEL</span>
          <SectionTitle>피자꼰대 영상에서 보기</SectionTitle>
          <div className="detail-videos">
            {restaurant.videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}

      {visitContribution !== undefined ? (
        <section className="detail-section detail-visit-form">
          <span>MY PIZZA STAMP</span>
          <SectionTitle>나도 먹어봤어요</SectionTitle>
          {visitContribution}
        </section>
      ) : null}

      {community !== undefined ? (
        <section className="detail-section detail-community">
          <span>COMMUNITY CRUST LOG</span>
          <SectionTitle>피자 팬들의 방문 인증 {community.length}</SectionTitle>
          <ReviewList visits={community} />
        </section>
      ) : null}
    </article>
  );
}
