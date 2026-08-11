import type { ReactNode } from "react";

import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireAdmin } from "@/features/admin/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div>
          <span>OWNER CONTROL ROOM</span>
          <strong>PIGGON ADMIN</strong>
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
