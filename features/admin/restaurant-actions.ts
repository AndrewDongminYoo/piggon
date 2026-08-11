"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

import { requireAdmin } from "./require-admin";
import {
  type RestaurantAdminActionState,
  type RestaurantAdminInput,
  restaurantAdminSchema,
} from "./restaurant-schema";

const restaurantIdSchema = z.string().uuid();

type AdminClient = ReturnType<typeof createAdminClient>;

type AdminRestaurantRow = {
  address: string | null;
  alternate_name: string | null;
  description: string | null;
  id: string;
  kakao_place_id: string | null;
  kind: RestaurantAdminInput["kind"];
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
  status: "draft" | "published" | "archived";
};

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseJsonField(formData: FormData, name: string): unknown {
  try {
    return JSON.parse(getText(formData, name));
  } catch {
    return "invalid-json";
  }
}

function getFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function refreshRestaurantPages(...slugs: Array<string | null>): void {
  revalidatePath("/");
  revalidatePath("/admin");
  for (const slug of new Set(slugs.filter((value) => value !== null))) {
    revalidatePath(`/restaurants/${slug}`);
  }
}

function parseRestaurantForm(formData: FormData) {
  return restaurantAdminSchema.safeParse({
    address: getText(formData, "address"),
    alternateName: getText(formData, "alternateName"),
    availabilityPeriods: parseJsonField(formData, "availabilityPeriods"),
    awards: parseJsonField(formData, "awards"),
    certifications: parseJsonField(formData, "certifications"),
    description: getText(formData, "description"),
    id: getText(formData, "id"),
    intent: getText(formData, "intent"),
    kakaoPlaceId: getText(formData, "kakaoPlaceId"),
    kind: getText(formData, "kind"),
    latitude: getText(formData, "latitude"),
    longitude: getText(formData, "longitude"),
    name: getText(formData, "name"),
    region: getText(formData, "region"),
    slug: getText(formData, "slug"),
    sourceUrl: getText(formData, "sourceUrl"),
  });
}

function getFormSnapshot(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [
      "address",
      "alternateName",
      "availabilityPeriods",
      "awards",
      "certifications",
      "description",
      "id",
      "intent",
      "kakaoPlaceId",
      "kind",
      "latitude",
      "longitude",
      "name",
      "region",
      "slug",
      "sourceUrl",
    ].map((name) => [name, getText(formData, name)]),
  );
}

async function loadRestaurantForPublication(
  admin: AdminClient,
  restaurantId: string,
): Promise<AdminRestaurantRow | null> {
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
    .eq("id", restaurantId)
    .maybeSingle();

  return error || !data ? null : (data as unknown as AdminRestaurantRow);
}

function mapRowToPublicationInput(row: AdminRestaurantRow) {
  return restaurantAdminSchema.safeParse({
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
    intent: "publish",
    kakaoPlaceId: row.kakao_place_id,
    kind: row.kind,
    latitude: row.latitude,
    longitude: row.longitude,
    name: row.name,
    region: row.region,
    slug: row.slug,
    sourceUrl: row.source_url,
  });
}

export async function saveRestaurant(
  _previousState: RestaurantAdminActionState,
  formData: FormData,
): Promise<RestaurantAdminActionState> {
  const user = await requireAdmin();
  const formValues = getFormSnapshot(formData);
  const parsed = parseRestaurantForm(formData);
  if (!parsed.success) {
    return {
      fieldErrors: getFieldErrors(parsed.error.flatten().fieldErrors),
      formValues,
      message: "맛집 입력값과 출처를 확인해 주세요.",
      status: "error",
    };
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = parsed.data.id
    ? await admin
        .from("restaurants")
        .select("id, slug, status")
        .eq("id", parsed.data.id)
        .maybeSingle()
    : { data: null, error: null };

  if (existingError || (parsed.data.id && !existing)) {
    return {
      formValues,
      message: "수정할 맛집을 찾을 수 없습니다.",
      status: "error",
    };
  }

  const targetStatus =
    parsed.data.intent === "publish"
      ? ("published" as const)
      : existing?.status === "archived"
        ? ("archived" as const)
        : ("draft" as const);
  const restaurant = {
    address: parsed.data.address,
    alternate_name: parsed.data.alternateName,
    description: parsed.data.description,
    kakao_place_id: parsed.data.kakaoPlaceId,
    kind: parsed.data.kind,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    name: parsed.data.name,
    region: parsed.data.region,
    slug: parsed.data.slug,
    source_url: parsed.data.sourceUrl,
    status: targetStatus,
    updated_by: user.id,
  } satisfies Json;
  const certifications = parsed.data.certifications.map((certification) => ({
    certification_number: certification.certificationNumber,
    issuer: certification.issuer,
    name: certification.name,
    source_url: certification.sourceUrl,
    valid_from: certification.validFrom,
    valid_until: certification.validUntil,
  })) satisfies Json;
  const awards = parsed.data.awards.map((award) => ({
    award_year: award.awardYear,
    competition_name: award.competitionName,
    division: award.division,
    placement: award.placement,
    source_url: award.sourceUrl,
  })) satisfies Json;
  const availabilityPeriods = parsed.data.availabilityPeriods.map((period) => ({
    ends_on: period.endsOn,
    note: period.note,
    starts_on: period.startsOn,
  })) satisfies Json;

  const { data: savedRestaurant, error: saveError } = await admin
    .rpc("save_restaurant_with_attributes", {
      p_availability_periods: availabilityPeriods,
      p_awards: awards,
      p_certifications: certifications,
      p_restaurant: restaurant,
      ...(existing ? { p_restaurant_id: existing.id } : {}),
    })
    .single();

  if (saveError || !savedRestaurant) {
    return {
      formValues,
      message:
        saveError?.code === "23505"
          ? "이미 사용 중인 슬러그 또는 Kakao 장소입니다."
          : "맛집과 인증·수상·운영기간을 저장하지 못했습니다.",
      status: "error",
    };
  }

  refreshRestaurantPages(
    existing?.slug ?? null,
    savedRestaurant.restaurant_slug,
  );
  return {
    message:
      parsed.data.intent === "publish"
        ? "맛집을 저장하고 공개했습니다."
        : existing?.status === "archived"
          ? "보관 상태를 유지한 채 내용을 저장했습니다."
          : "맛집을 초안으로 저장했습니다.",
    restaurantId: savedRestaurant.restaurant_id,
    status: "success",
  };
}

export async function publishRestaurant(
  _previousState: RestaurantAdminActionState,
  formData: FormData,
): Promise<RestaurantAdminActionState> {
  const user = await requireAdmin();
  const parsedId = restaurantIdSchema.safeParse(getText(formData, "id"));
  if (!parsedId.success) {
    return { message: "공개할 맛집을 확인해 주세요.", status: "error" };
  }

  const admin = createAdminClient();
  const restaurant = await loadRestaurantForPublication(admin, parsedId.data);
  if (!restaurant) {
    return { message: "공개할 맛집을 찾을 수 없습니다.", status: "error" };
  }

  const publication = mapRowToPublicationInput(restaurant);
  if (!publication.success) {
    return {
      fieldErrors: getFieldErrors(publication.error.flatten().fieldErrors),
      message: "주소, 좌표, 출처와 팝업 운영기간을 채운 뒤 공개해 주세요.",
      restaurantId: restaurant.id,
      status: "error",
    };
  }

  const { error } = await admin
    .from("restaurants")
    .update({ status: "published", updated_by: user.id })
    .eq("id", restaurant.id);
  if (error) {
    return { message: "맛집을 공개하지 못했습니다.", status: "error" };
  }

  refreshRestaurantPages(restaurant.slug);
  return {
    message: "맛집을 공개했습니다.",
    restaurantId: restaurant.id,
    status: "success",
  };
}

async function updateRestaurantStatus(
  formData: FormData,
  status: "draft" | "archived",
): Promise<RestaurantAdminActionState> {
  const user = await requireAdmin();
  const parsedId = restaurantIdSchema.safeParse(getText(formData, "id"));
  if (!parsedId.success) {
    return { message: "상태를 바꿀 맛집을 확인해 주세요.", status: "error" };
  }

  const admin = createAdminClient();
  const { data: restaurant, error: findError } = await admin
    .from("restaurants")
    .select("id, slug")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (findError || !restaurant) {
    return { message: "맛집을 찾을 수 없습니다.", status: "error" };
  }

  const { error } = await admin
    .from("restaurants")
    .update({ status, updated_by: user.id })
    .eq("id", restaurant.id);
  if (error) {
    return { message: "맛집 상태를 변경하지 못했습니다.", status: "error" };
  }

  refreshRestaurantPages(restaurant.slug);
  return {
    message:
      status === "archived"
        ? "맛집을 보관했습니다. 공개 지도에서는 숨겨집니다."
        : "맛집을 초안으로 복원했습니다.",
    restaurantId: restaurant.id,
    status: "success",
  };
}

export async function archiveRestaurant(
  _previousState: RestaurantAdminActionState,
  formData: FormData,
): Promise<RestaurantAdminActionState> {
  return updateRestaurantStatus(formData, "archived");
}

export async function restoreRestaurant(
  _previousState: RestaurantAdminActionState,
  formData: FormData,
): Promise<RestaurantAdminActionState> {
  return updateRestaurantStatus(formData, "draft");
}
