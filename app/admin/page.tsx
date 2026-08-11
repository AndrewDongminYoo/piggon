import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/features/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "맛집 관리",
};

const STATUS_LABEL = {
  archived: "보관",
  draft: "초안",
  published: "공개",
} as const;

export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("id, slug, name, region, kind, status, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load restaurant administration list", {
      cause: error,
    });
  }

  const counts = {
    archived: data.filter(({ status }) => status === "archived").length,
    draft: data.filter(({ status }) => status === "draft").length,
    published: data.filter(({ status }) => status === "published").length,
  };

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span>RESTAURANT INDEX</span>
          <h1>맛집 관리</h1>
          <p>
            출처를 확인한 맛집만 공개하고, 종료된 팝업은 운영기간으로 남깁니다.
          </p>
        </div>
        <Link href="/admin/restaurants/new">+ 새 맛집 등록</Link>
      </header>

      <dl className="admin-stats">
        <div>
          <dt>초안</dt>
          <dd>{counts.draft}</dd>
        </div>
        <div>
          <dt>공개</dt>
          <dd>{counts.published}</dd>
        </div>
        <div>
          <dt>보관</dt>
          <dd>{counts.archived}</dd>
        </div>
      </dl>

      <section className="admin-restaurant-list">
        {data.map((restaurant) => (
          <article key={restaurant.id}>
            <div>
              <span
                className={`admin-status admin-status--${restaurant.status}`}
              >
                {STATUS_LABEL[restaurant.status]}
              </span>
              <small>{restaurant.kind}</small>
            </div>
            <h2>{restaurant.name}</h2>
            <p>{restaurant.region}</p>
            <Link href={`/admin/restaurants/${restaurant.id}`}>편집하기 →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
