"use client";

import dynamic from "next/dynamic";

import { GoogleSignIn } from "@/components/auth/google-sign-in";

import type { ViewerProfile, ViewerVisit } from "../queries";

const ProfileForm = dynamic(() =>
  import("./visit-form").then((module) => module.ProfileForm),
);
const VisitForm = dynamic(() =>
  import("./visit-form").then((module) => module.VisitForm),
);

type VisitContributionProps = {
  currentDate: string;
  restaurantId: string;
  restaurantSlug: string;
  viewer: {
    profile: ViewerProfile | null;
    userId: string;
    visit: ViewerVisit | null;
  } | null;
};

export function VisitContribution({
  currentDate,
  restaurantId,
  restaurantSlug,
  viewer,
}: VisitContributionProps) {
  if (viewer === null) {
    return (
      <div className="visit-login-callout">
        <p>
          Google 로그인 후 방문 사진이나 공개 Instagram 게시물로 피자 발자국을
          남길 수 있습니다.
        </p>
        <GoogleSignIn nextPath={`/restaurants/${restaurantSlug}`} />
      </div>
    );
  }

  if (viewer.profile === null) {
    return (
      <div className="visit-profile-callout">
        <p>방문 인증에 공개될 표시 이름을 먼저 정해 주세요.</p>
        <ProfileForm />
      </div>
    );
  }

  return (
    <>
      <p className="visit-form-intro">
        {viewer.profile.displayName}님의 인증은 리워드나 자동 판정 없이 커뮤니티
        기록으로 공개됩니다.
      </p>
      <VisitForm
        currentDate={currentDate}
        existingVisit={viewer.visit}
        restaurantId={restaurantId}
        userId={viewer.userId}
      />
    </>
  );
}
