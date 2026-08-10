import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main>
      <h1>로그인을 완료하지 못했습니다</h1>
      <p>잠시 후 다시 시도해 주세요.</p>
      <Link href="/">피자 지도로 돌아가기</Link>
    </main>
  );
}
