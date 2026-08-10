import { AtlasShell } from "@/features/restaurants/components/atlas-shell";
import { listPublishedRestaurants } from "@/features/restaurants/queries";

export default async function Home() {
  const restaurants = await listPublishedRestaurants();
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());

  return <AtlasShell currentDate={currentDate} restaurants={restaurants} />;
}
