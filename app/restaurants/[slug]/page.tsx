import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { RestaurantDetail } from "@/features/restaurants/components/restaurant-detail";
import { getPublishedRestaurantBySlug } from "@/features/restaurants/queries";
import {
  getPublicRestaurantCommunity,
  getViewerProfile,
  getViewerVisit,
} from "@/features/visits/queries";
import { createClient } from "@/lib/supabase/server";

const getRestaurant = cache(getPublishedRestaurantBySlug);

function getCurrentSeoulDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

export async function generateMetadata({
  params,
}: PageProps<"/restaurants/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    return { title: "찾을 수 없는 맛집" };
  }

  return {
    description:
      restaurant.description ??
      `${restaurant.name}의 위치와 확인된 피자 정보를 살펴보세요.`,
    title: restaurant.name,
  };
}

export default async function RestaurantPage({
  params,
}: PageProps<"/restaurants/[slug]">) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) {
    notFound();
  }

  const supabase = await createClient();
  const [{ data: authData }, community] = await Promise.all([
    supabase.auth.getUser(),
    getPublicRestaurantCommunity(restaurant.id),
  ]);
  const viewer = authData.user
    ? await Promise.all([
        getViewerProfile(authData.user.id),
        getViewerVisit(restaurant.id, authData.user.id),
      ]).then(([profile, visit]) => ({
        profile,
        userId: authData.user.id,
        visit,
      }))
    : null;

  return (
    <main className="restaurant-detail-page">
      <RestaurantDetail
        community={community}
        currentDate={getCurrentSeoulDate()}
        restaurant={restaurant}
        viewer={viewer}
      />
    </main>
  );
}
