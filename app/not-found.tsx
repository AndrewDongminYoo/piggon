import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-not-found">
      <span aria-hidden="true">?</span>
      <h1>이 조각은 지도에 없습니다</h1>
      <p>
        주소가 바뀌었거나 아직 공개하지 않은 페이지예요. 검증이 끝난 맛집부터
        다시 살펴보세요.
      </p>
      <Link href="/">맛집 지도로 돌아가기</Link>
    </main>
  );
}
