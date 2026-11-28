import { AdminShell } from "@/shop/components/admin/kit";
import { can, PERMISSIONS, requireAdminPage } from "@/shop/server/auth/admin";
import { adminLogout } from "@/shop/server/admin/auth-actions";

/** Every admin page is behind this check; each page and action re-checks its own permission too. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage("dashboard");
  return (
    <AdminShell admin={{ fullName: admin.fullName, role: admin.role }} perms={PERMISSIONS.filter((p) => can(admin.role, p))} logout={adminLogout}>
      {children}
    </AdminShell>
  );
}
