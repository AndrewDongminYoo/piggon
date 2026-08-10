import type { Metadata } from "next";

import {
  ModerationTable,
  type ModerationRow,
} from "@/features/admin/components/moderation-table";
import { requireAdmin } from "@/features/admin/require-admin";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "커뮤니티 관리",
};

type Tables = Database["public"]["Tables"];

type ReviewRow = Pick<
  Tables["reviews"]["Row"],
  "body" | "created_at" | "hidden" | "id"
>;

type VisitModerationRow = Pick<
  Tables["visits"]["Row"],
  "created_at" | "evidence_type" | "hidden" | "id" | "user_id"
> & {
  restaurants: Pick<Tables["restaurants"]["Row"], "name" | "slug"> | null;
  reviews: ReviewRow | ReviewRow[] | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminModerationPage() {
  await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("visits")
    .select(
      `
        id,
        user_id,
        created_at,
        evidence_type,
        hidden,
        restaurants (
          name,
          slug
        ),
        reviews (
          id,
          body,
          hidden,
          created_at
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load moderation records", { cause: error });
  }

  const visits = data as unknown as VisitModerationRow[];
  const userIds = [...new Set(visits.map((visit) => visit.user_id))];
  const profileResult =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [], error: null };
  if (profileResult.error) {
    throw new Error("Unable to load moderation profile names", {
      cause: profileResult.error,
    });
  }

  const profileNames = new Map(
    profileResult.data.map((profile) => [profile.id, profile.display_name]),
  );
  const rows = visits
    .flatMap((visit) => {
      if (!visit.restaurants) {
        return [];
      }

      const displayName = profileNames.get(visit.user_id) ?? "프로필 없음";
      const reviews = Array.isArray(visit.reviews)
        ? visit.reviews
        : visit.reviews
          ? [visit.reviews]
          : [];
      const shared = {
        displayName,
        evidenceType: visit.evidence_type,
        parentVisitHidden: visit.hidden,
        restaurantName: visit.restaurants.name,
      };

      return [
        {
          ...shared,
          contentType: "visit" as const,
          createdAtIso: visit.created_at,
          hidden: visit.hidden,
          id: visit.id,
          preview:
            visit.evidence_type === "photo"
              ? "업로드 사진"
              : "Instagram 게시물",
        },
        ...reviews.map((review) => ({
          ...shared,
          contentType: "review" as const,
          createdAtIso: review.created_at,
          hidden: review.hidden,
          id: review.id,
          preview: review.body,
        })),
      ];
    })
    .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso))
    .map(({ createdAtIso, ...row }): ModerationRow => ({
      ...row,
      createdAt: DATE_FORMATTER.format(new Date(createdAtIso)),
    }));

  return (
    <main className="admin-page">
      <header className="admin-page-heading">
        <div>
          <span>COMMUNITY SIGNALS</span>
          <h1>커뮤니티 관리</h1>
          <p>
            방문 인증과 리뷰를 삭제하지 않고 공개 화면에서 숨기거나 다시
            복원합니다.
          </p>
        </div>
        <strong>{rows.length} RECORDS</strong>
      </header>

      <ModerationTable rows={rows} />
    </main>
  );
}
