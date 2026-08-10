import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { RestaurantDetail } from "@/features/restaurants/components/restaurant-detail";
import { getPublishedRestaurantBySlug } from "@/features/restaurants/queries";

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

  return (
    <main className="restaurant-detail-page">
      <RestaurantDetail
        currentDate={getCurrentSeoulDate()}
        restaurant={restaurant}
      />
    </main>
  );
}
