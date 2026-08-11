import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { StampBadge } from "@/components/ui/stamp-badge";
import { ProfileForm } from "@/features/visits/components/visit-form";
import { VisitCard } from "@/features/visits/components/visit-card";
import {
  getViewerProfile,
  listUserCollection,
} from "@/features/visits/queries";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = {
  description: "내가 먹어본 피자와 방문 인증 리뷰를 모아봅니다.",
  title: "먹어본 피자",
};

export default async function MyPizzaPage() {
  const user = await requireUser("/me");
  const [profile, collection] = await Promise.all([
    getViewerProfile(user.id),
    listUserCollection(user.id),
  ]);

  return (
    <main className="collection-page">
      <header className="collection-hero">
        <div>
          <StampBadge tone="tomato">MY SLICE LOG</StampBadge>
          <h1>내가 먹어본 피자</h1>
          <p>
            리워드 경쟁 대신 직접 먹어본 피자를 하나씩 모으는 개인 컬렉션입니다.
          </p>
        </div>
        <strong>
          <span>{collection.length}</span>
          방문 인증
        </strong>
      </header>

      <section className="collection-profile paper-panel">
        <h2>커뮤니티 이름</h2>
        <ProfileForm displayName={profile?.displayName} />
        <SignOutButton />
      </section>

      <section className="collection-list-section">
        <div className="collection-list-heading">
          <span>COLLECTION</span>
          <h2>피자 발자국</h2>
        </div>
        {collection.length === 0 ? (
          <div className="collection-empty paper-panel">
            <strong>아직 찍힌 피자 도장이 없어요.</strong>
            <p>맛집 상세에서 첫 방문을 인증해 보세요.</p>
          </div>
        ) : (
          <div className="collection-grid">
            {collection.map((visit) => (
              <VisitCard
                key={visit.id}
                ownerVisit={visit}
                visit={{
                  displayName: profile?.displayName ?? "나",
                  evidenceType: visit.evidenceType,
                  id: visit.id,
                  instagramUrl: visit.instagramUrl,
                  photoUrl: visit.photoUrl,
                  review: visit.review,
                  visitedOn: visit.visitedOn,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
