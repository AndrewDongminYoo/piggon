export type AdminRestaurantStatus = "draft" | "published" | "archived";
export type AdminRestaurantStatusFilter = AdminRestaurantStatus | "all";

type AdminRestaurantIndexItem = {
  name: string;
  status: AdminRestaurantStatus;
};

type AdminRestaurantIndexFilter = {
  query: string;
  status: AdminRestaurantStatusFilter;
};

export function filterAdminRestaurantIndex<T extends AdminRestaurantIndexItem>(
  restaurants: T[],
  { query, status }: AdminRestaurantIndexFilter,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  return restaurants.filter((restaurant) => {
    const matchesStatus = status === "all" || restaurant.status === status;
    const matchesQuery = restaurant.name
      .toLowerCase()
      .includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}
