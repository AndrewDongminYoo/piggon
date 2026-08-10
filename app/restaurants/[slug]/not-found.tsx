import Link from "next/link";

export default function RestaurantNotFound() {
  return (
    <main className="route-not-found">
      <span aria-hidden="true">?</span>
      <h1>이 피자집은 아직 지도에 없습니다</h1>
      <p>
        공개 전 검증 중이거나 주소가 잘못되었을 수 있어요. 공개된 맛집 목록에서
        다시 찾아보세요.
      </p>
      <Link href="/">맛집 지도로 돌아가기</Link>
    </main>
  );
}
