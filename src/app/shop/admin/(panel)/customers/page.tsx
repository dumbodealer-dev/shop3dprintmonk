import Link from "next/link";
import { Download } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { Badge } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Customers" };

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  await requireAdminPage("customers");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = db().from("shop_customers").select("id, email, full_name, phone, status, email_verified_at, created_at, deletion_requested_at, last_login_at", { count: "exact" }).neq("status", "deleted").order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  const term = sp.q?.trim().replace(/[%,()*"\\]/g, "");
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term.replace(/\D/g, "") || term}%`);
  if (sp.filter === "deletion") q = q.not("deletion_requested_at", "is", null);
  if (sp.filter === "suspended") q = q.eq("status", "suspended");
  const { data, count } = await q;
  return (
    <>
      <PageTitle
        title="Customers"
        subtitle={`${count ?? 0} registered customers`}
        actions={<>
          <a href={shopHref("/admin/api/export?kind=customers")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold"><Download className="h-4 w-4" /> Customers CSV</a>
          <a href={shopHref("/admin/api/export?kind=newsletter")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold"><Download className="h-4 w-4" /> Newsletter CSV</a>
        </>}
      />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className="input h-10 w-72 py-0 text-sm" />
        <select name="filter" defaultValue={sp.filter ?? ""} className="input h-10 w-56 py-0 text-sm"><option value="">All</option><option value="deletion">Deletion requested</option><option value="suspended">Suspended</option></select>
        <button className="h-10 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Joined</th><th className="p-3">Last sign-in</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3"><Link href={shopHref(`/admin/customers/${c.id}`)} className="font-semibold hover:text-accent-ink">{c.full_name}</Link><span className="block text-xs text-muted">{c.email}</span></td>
                <td className="p-3 text-muted">{c.phone ?? "—"}</td>
                <td className="p-3 text-muted">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                <td className="p-3 text-muted">{c.last_login_at ? new Date(c.last_login_at).toLocaleDateString("en-IN") : "—"}</td>
                <td className="p-3 space-x-1"><Badge tone={c.status === "active" ? "success" : "danger"}>{c.status}</Badge>{!c.email_verified_at && <Badge>Unverified</Badge>}{c.deletion_requested_at && <Badge tone="warning">Deletion requested</Badge>}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="p-8 text-center text-muted">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
