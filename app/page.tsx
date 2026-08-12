import { AtlasShell } from "@/features/restaurants/components/atlas-shell";
import { listPublishedRestaurants } from "@/features/restaurants/queries";
import { parseAtlasUrlState } from "@/features/restaurants/atlas-url-state";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
  const restaurants = await listPublishedRestaurants(
    { includeEndedPopups: true },
    currentDate,
  );
  const initialState = parseAtlasUrlState(await searchParams);

  return (
    <AtlasShell
      currentDate={currentDate}
      initialState={initialState}
      restaurants={restaurants}
    />
  );
}
