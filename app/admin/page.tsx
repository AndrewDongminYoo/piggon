import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { requireAdmin } from "@/features/admin/require-admin";
import {
  filterAdminRestaurantIndex,
  type AdminRestaurantStatusFilter,
} from "@/features/admin/restaurant-index";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "맛집 관리",
};

const STATUS_LABEL = {
  archived: "보관",
  draft: "초안",
  published: "공개",
} as const;

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];

  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function readStatus(value: string): AdminRestaurantStatusFilter {
  return value === "draft" || value === "published" || value === "archived"
    ? value
    : "all";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
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
  const params = await searchParams;
  const query = readSearchParam(params, "q");
  const status = readStatus(readSearchParam(params, "status"));
  const filteredRestaurants = filterAdminRestaurantIndex(data, {
    query,
    status,
  });

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

      <Form action="/admin" className="admin-index-filter">
        <label>
          <span>맛집 찾기</span>
          <input
            defaultValue={query}
            name="q"
            placeholder="상호명으로 검색"
            type="search"
          />
        </label>
        <label>
          <span>공개 상태</span>
          <select defaultValue={status} name="status">
            <option value="all">전체 상태</option>
            <option value="draft">초안</option>
            <option value="published">공개</option>
            <option value="archived">보관</option>
          </select>
        </label>
        <button type="submit">적용</button>
        {query || status !== "all" ? <Link href="/admin">초기화</Link> : null}
      </Form>

      <p aria-live="polite" className="admin-index-results">
        <strong>{filteredRestaurants.length}</strong>곳 표시 중
      </p>

      <section className="admin-restaurant-list">
        {filteredRestaurants.map((restaurant) => (
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
        {filteredRestaurants.length === 0 ? (
          <p className="admin-restaurant-list__empty">
            조건에 맞는 맛집이 없습니다.
          </p>
        ) : null}
      </section>
    </main>
  );
}
