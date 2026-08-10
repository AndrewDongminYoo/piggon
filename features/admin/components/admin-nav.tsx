import Link from "next/link";

export function AdminNav() {
  return (
    <nav aria-label="관리자 메뉴" className="admin-nav">
      <Link href="/admin">맛집 관리</Link>
      <Link href="/admin/restaurants/new">새 맛집 등록</Link>
      <Link href="/admin/videos">영상 관리</Link>
      <Link href="/admin/moderation">커뮤니티 관리</Link>
    </nav>
  );
}
