import "server-only";

import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

import { filterRestaurants } from "./filters";
import type { RestaurantDetail, RestaurantFilter } from "./types";

const RESTAURANT_SELECT = `
  id,
  slug,
  name,
  alternate_name,
  description,
  region,
  address,
  kakao_place_id,
  latitude,
  longitude,
  kind,
  source_url,
  restaurant_certifications (
    name,
    issuer,
    certification_number,
    valid_from,
    valid_until,
    source_url
  ),
  restaurant_awards (
    competition_name,
    award_year,
    division,
    placement,
    source_url
  ),
  restaurant_availability_periods (
    starts_on,
    ends_on,
    note
  ),
  restaurant_videos (
    start_seconds,
    context_note,
    videos (
      id,
      youtube_video_id,
      canonical_url,
      title,
      thumbnail_url,
      published_at
    )
  )
`;

type Tables = Database["public"]["Tables"];

type RestaurantRow = Tables["restaurants"]["Row"] & {
  restaurant_certifications: Tables["restaurant_certifications"]["Row"][];
  restaurant_awards: Tables["restaurant_awards"]["Row"][];
  restaurant_availability_periods: Tables["restaurant_availability_periods"]["Row"][];
  restaurant_videos: Array<
    Pick<
      Tables["restaurant_videos"]["Row"],
      "context_note" | "start_seconds"
    > & {
      videos: Tables["videos"]["Row"] | null;
    }
  >;
};

function mapRestaurant(row: RestaurantRow): RestaurantDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    alternateName: row.alternate_name,
    description: row.description,
    region: row.region,
    address: row.address,
    kakaoPlaceId: row.kakao_place_id,
    latitude: row.latitude,
    longitude: row.longitude,
    kind: row.kind,
    sourceUrl: row.source_url,
    certifications: row.restaurant_certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
      certificationNumber: certification.certification_number,
      validFrom: certification.valid_from,
      validUntil: certification.valid_until,
      sourceUrl: certification.source_url,
    })),
    awards: row.restaurant_awards.map((award) => ({
      competitionName: award.competition_name,
      awardYear: award.award_year,
      division: award.division,
      placement: award.placement,
      sourceUrl: award.source_url,
    })),
    availabilityPeriods: row.restaurant_availability_periods.map((period) => ({
      startsOn: period.starts_on,
      endsOn: period.ends_on,
      note: period.note,
    })),
    videos: row.restaurant_videos.flatMap((link) =>
      link.videos
        ? [
            {
              id: link.videos.id,
              youtubeVideoId: link.videos.youtube_video_id,
              canonicalUrl: link.videos.canonical_url,
              title: link.videos.title,
              thumbnailUrl: link.videos.thumbnail_url,
              publishedAt: link.videos.published_at,
              startSeconds: link.start_seconds,
              contextNote: link.context_note,
            },
          ]
        : [],
    ),
  };
}

export async function listPublishedRestaurants(
  filter: RestaurantFilter = {},
  currentDate = new Date().toISOString().slice(0, 10),
): Promise<RestaurantDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("status", "published")
    .order("name");

  if (error) {
    throw new Error("Unable to load restaurants", { cause: error });
  }

  return filterRestaurants(
    (data as unknown as RestaurantRow[]).map(mapRestaurant),
    filter,
    currentDate,
  );
}

export async function getPublishedRestaurantBySlug(
  slug: string,
): Promise<RestaurantDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load restaurant", { cause: error });
  }

  return data ? mapRestaurant(data as unknown as RestaurantRow) : null;
}
