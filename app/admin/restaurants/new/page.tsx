import type { Metadata } from "next";

import { RestaurantForm } from "@/features/admin/components/restaurant-form";
import { requireAdmin } from "@/features/admin/require-admin";
import { getPublicEnv } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "새 맛집 등록",
};

export default async function NewRestaurantPage() {
  await requireAdmin();
  const { kakaoMapAppKey } = getPublicEnv();

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span>NEW RESTAURANT</span>
          <h1>새 맛집 등록</h1>
          <p>
            초안은 핵심 이름만으로 저장할 수 있고, 공개할 때 출처를 완성합니다.
          </p>
        </div>
      </header>
      <RestaurantForm appKey={kakaoMapAppKey} />
    </main>
  );
}
