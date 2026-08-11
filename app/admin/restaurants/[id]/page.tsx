import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  RestaurantForm,
  type RestaurantFormValue,
} from "@/features/admin/components/restaurant-form";
import { requireAdmin } from "@/features/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicEnv } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "맛집 편집",
};

type RestaurantAdminRow = {
  address: string | null;
  alternate_name: string | null;
  description: string | null;
  id: string;
  kakao_place_id: string | null;
  kind: RestaurantFormValue["kind"];
  latitude: number | null;
  longitude: number | null;
  name: string;
  region: string;
  restaurant_availability_periods: Array<{
    ends_on: string | null;
    note: string | null;
    starts_on: string;
  }>;
  restaurant_awards: Array<{
    award_year: number;
    competition_name: string;
    division: string;
    placement: string;
    source_url: string;
  }>;
  restaurant_certifications: Array<{
    certification_number: string | null;
    issuer: string;
    name: string;
    source_url: string;
    valid_from: string | null;
    valid_until: string | null;
  }>;
  slug: string;
  source_url: string | null;
  status: RestaurantFormValue["status"];
};

export default async function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select(
      `
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
        status,
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
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load restaurant administration detail", {
      cause: error,
    });
  }

  if (!data) {
    notFound();
  }

  const row = data as unknown as RestaurantAdminRow;
  const initialValue: RestaurantFormValue = {
    address: row.address,
    alternateName: row.alternate_name,
    availabilityPeriods: row.restaurant_availability_periods.map((period) => ({
      endsOn: period.ends_on,
      note: period.note,
      startsOn: period.starts_on,
    })),
    awards: row.restaurant_awards.map((award) => ({
      awardYear: award.award_year,
      competitionName: award.competition_name,
      division: award.division,
      placement: award.placement,
      sourceUrl: award.source_url,
    })),
    certifications: row.restaurant_certifications.map((certification) => ({
      certificationNumber: certification.certification_number,
      issuer: certification.issuer,
      name: certification.name,
      sourceUrl: certification.source_url,
      validFrom: certification.valid_from,
      validUntil: certification.valid_until,
    })),
    description: row.description,
    id: row.id,
    kakaoPlaceId: row.kakao_place_id,
    kind: row.kind,
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.name,
    region: row.region,
    slug: row.slug,
    sourceUrl: row.source_url,
    status: row.status,
  };
  const { kakaoMapAppKey } = getPublicEnv();

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span>EDIT RESTAURANT</span>
          <h1>{row.name}</h1>
          <p>공개 상태를 바꾸기 전에 주소·좌표·출처를 다시 확인합니다.</p>
        </div>
      </header>
      <RestaurantForm appKey={kakaoMapAppKey} initialValue={initialValue} />
    </main>
  );
}
