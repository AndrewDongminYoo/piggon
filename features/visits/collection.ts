export type CollectionRestaurant = {
  id: string;
  isAvailable: boolean;
  name: string;
  region: string;
  slug: string | null;
};

type PublishedRestaurant = Omit<CollectionRestaurant, "isAvailable"> & {
  slug: string;
};

export function getCollectionRestaurant(
  restaurantId: string,
  restaurant: PublishedRestaurant | null,
): CollectionRestaurant {
  if (restaurant) {
    return { ...restaurant, isAvailable: true };
  }

  return {
    id: restaurantId,
    isAvailable: false,
    name: "현재 비공개된 맛집",
    region: "운영자 검수 중",
    slug: null,
  };
}
