import { PageTitle } from "@/shop/components/admin/kit";
import { TeamManager } from "@/shop/components/admin/Managers";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Team & roles" };

export default async function TeamAdmin() {
  const me = await requireAdminPage("team");
  const [{ data }, { data: audit }] = await Promise.all([
    db().from("shop_admins").select("id, email, full_name, role, status, last_login_at").order("created_at"),
    db().from("shop_admin_audit").select("id, action, entity, entity_id, created_at, admin:shop_admins (full_name)").order("created_at", { ascending: false }).limit(40),
  ]);
  return (
    <>
      <PageTitle title="Team & roles" subtitle="Admin accounts are separate from customer accounts. Sessions expire after 12 hours or 2 hours of inactivity." />
      <TeamManager rows={data ?? []} meId={me.id} />
      <h2 className="mt-10 text-lg font-bold">Activity log</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <tbody>
            {((audit ?? []) as unknown as { id: string; action: string; entity: string | null; entity_id: string | null; created_at: string; admin: { full_name: string } | null }[]).map((a) => (
              <tr key={a.id} className="border-t border-line first:border-0">
                <td className="p-3 text-muted">{new Date(a.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="p-3">{a.admin?.full_name ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{a.action}</td>
                <td className="p-3 text-xs text-muted">{a.entity} {a.entity_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
