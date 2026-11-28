import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { CustomerAdminActions } from "@/shop/components/admin/Managers";
import { Badge, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, statusTone, type OrderStatus } from "@/shop/lib/order-status";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Customer" };

export default async function CustomerAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("customers");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: c }, { data: orders }, { data: addresses }] = await Promise.all([
    db().from("shop_customers").select("*").eq("id", id).maybeSingle(),
    db().from("shop_orders").select("id, order_number, status, grand_total, payment_status, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    db().from("shop_addresses").select("*").eq("customer_id", id),
  ]);
  if (!c) notFound();
  const spent = (orders ?? []).filter((o) => ["paid", "cod_pending"].includes(o.payment_status) && o.status !== "cancelled").reduce((s, o) => s + Number(o.grand_total), 0);
  return (
    <>
      <Link href={shopHref("/admin/customers")} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink"><ArrowLeft className="h-4 w-4" /> Customers</Link>
      <PageTitle title={c.full_name} subtitle={<>{c.email} · {c.phone ?? "no phone"} · joined {new Date(c.created_at).toLocaleDateString("en-IN")}</>} actions={<Badge tone={c.status === "active" ? "success" : "danger"}>{c.status}</Badge>} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5"><p className="text-sm text-muted">Orders</p><p className="text-2xl font-extrabold">{orders?.length ?? 0}</p></div>
            <div className="card p-5"><p className="text-sm text-muted">Lifetime spend</p><p className="text-2xl font-extrabold">{formatINR(spent)}</p></div>
            <div className="card p-5"><p className="text-sm text-muted">Email</p><p className="text-lg font-bold">{c.email_verified_at ? "Verified" : "Not verified"}</p><p className="text-xs text-muted">{c.marketing_opt_in ? "Subscribed to marketing" : "No marketing"}</p></div>
          </div>
          {c.deletion_requested_at && <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Deletion requested on {new Date(c.deletion_requested_at).toLocaleDateString("en-IN")}{c.deletion_reason ? `: “${c.deletion_reason}”` : ""}</div>}
          <section className="card p-5">
            <h2 className="font-bold">Order history</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {(orders ?? []).map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="py-2.5"><Link href={shopHref(`/admin/orders/${o.id}`)} className="font-mono font-semibold hover:text-accent-ink">{o.order_number}</Link></td>
                    <td className="py-2.5 text-muted">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5"><Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</Badge></td>
                    <td className="py-2.5 text-right font-semibold">{formatINR(o.grand_total)}</td>
                  </tr>
                ))}
                {!orders?.length && <tr><td className="py-4 text-muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </section>
          <section className="card p-5">
            <h2 className="font-bold">Saved addresses</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(addresses ?? []).map((a) => <p key={a.id} className="rounded-xl bg-paper p-3 text-sm">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>)}
              {!addresses?.length && <p className="text-sm text-muted">None saved.</p>}
            </div>
          </section>
        </div>
        <CustomerAdminActions id={c.id} status={c.status} notes={c.admin_notes ?? ""} deletionRequested={!!c.deletion_requested_at} />
      </div>
    </>
  );
}
