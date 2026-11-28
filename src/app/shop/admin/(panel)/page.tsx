import Link from "next/link";
import { AlertTriangle, PackageCheck, Truck, Wallet } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { RevenueChart } from "@/shop/components/admin/RevenueChart";
import { Badge, Notice, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, statusTone, type OrderStatus } from "@/shop/lib/order-status";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db, must } from "@/shop/server/db";
import { shopIntegrations } from "@/shop/server/env";

export const metadata = { title: "Dashboard" };

type Stats = {
  total_sales: number; total_orders: number; average_order_value: number; new_customers: number; total_customers: number;
  pending_payment: number; to_process: number; awaiting_shipment: number; needs_review: number;
  revenue_by_day: { day: string; revenue: number; orders: number }[];
  bestsellers: { product_id: string; name: string; units: number; revenue: number }[];
  low_stock: { variant_id: string; sku: string; stock: number; name: string; title: string; product_id: string }[];
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months" } as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; denied?: string }> }) {
  await requireAdminPage("dashboard");
  const sp = await searchParams;
  const custom = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) && sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to);
  const days = sp.range && sp.range in RANGES ? Number(sp.range) : 30;
  const to = custom ? new Date(`${sp.to}T23:59:59+05:30`) : new Date();
  const from = custom ? new Date(`${sp.from}T00:00:00+05:30`) : daysAgo(days);
  const stats = must(await db().rpc("shop_dashboard", { p_from: from.toISOString(), p_to: to.toISOString() }), "dashboard") as Stats;
  const { data: recent } = await db().from("shop_orders").select("id, order_number, customer_name, grand_total, status, payment_method, created_at").order("created_at", { ascending: false }).limit(8);
  const rangeKey = custom ? "custom" : String(days);

  return (
    <>
      <PageTitle title="Dashboard" subtitle={`${from.toLocaleDateString("en-IN")} – ${to.toLocaleDateString("en-IN")}`} />
      {sp.denied && <div className="mb-4"><Notice tone="warning">Your role doesn&apos;t have access to that section.</Notice></div>}
      {!shopIntegrations.razorpay && <div className="mb-4"><Notice tone="warning">Online payments are off: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (see README → Shop → Payments). Cash on delivery still works.</Notice></div>}

      <form className="mb-6 flex flex-wrap items-end gap-2" method="get">
        {Object.entries(RANGES).map(([k, v]) => (
          <Link key={k} href={shopHref(`/admin?range=${k}`)} aria-current={rangeKey === k ? "true" : undefined} className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ${rangeKey === k ? "bg-ink-900 text-white" : "border border-line bg-white hover:bg-paper"}`}>{v}</Link>
        ))}
        <label className="ml-2 text-sm"><span className="sr-only">From</span><input type="date" name="from" defaultValue={sp.from} className="input h-9 py-0 text-sm" /></label>
        <label className="text-sm"><span className="sr-only">To</span><input type="date" name="to" defaultValue={sp.to} className="input h-9 py-0 text-sm" /></label>
        <button type="submit" className="h-9 rounded-full border border-line bg-white px-4 text-sm font-semibold">Apply</button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key figures">
        <Kpi label="Total sales" value={formatINR(stats.total_sales)} note="Paid + COD, excl. cancelled" />
        <Kpi label="Orders" value={stats.total_orders.toLocaleString("en-IN")} />
        <Kpi label="Average order value" value={formatINR(stats.average_order_value)} />
        <Kpi label="Customers" value={stats.total_customers.toLocaleString("en-IN")} note={`${stats.new_customers} new in range`} />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Needs attention">
        <Work href="/admin/orders?status=payment_confirmed,processing" icon={<PackageCheck className="h-5 w-5" />} label="To process" n={stats.to_process} />
        <Work href="/admin/orders?status=ready_for_shipment" icon={<Truck className="h-5 w-5" />} label="Awaiting shipment" n={stats.awaiting_shipment} />
        <Work href="/admin/orders?status=pending_payment" icon={<Wallet className="h-5 w-5" />} label="Pending payment (48 h)" n={stats.pending_payment} />
        <Work href="/admin/orders?review=1" icon={<AlertTriangle className="h-5 w-5" />} label="Flagged for review" n={stats.needs_review} tone={stats.needs_review ? "danger" : undefined} />
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-bold">Revenue by day</h2>
        <p className="text-sm text-muted">Order totals incl. GST, India time</p>
        <div className="mt-4">{stats.revenue_by_day.length ? <RevenueChart data={stats.revenue_by_day.map((d) => ({ ...d, revenue: Number(d.revenue) }))} /> : <p className="text-muted">No data yet.</p>}</div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between"><h2 className="font-bold">Recent orders</h2><Link href={shopHref("/admin/orders")} className="text-sm font-semibold text-accent-ink">All orders</Link></div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {(recent ?? []).map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="py-2.5"><Link href={shopHref(`/admin/orders/${o.id}`)} className="font-mono font-semibold hover:text-accent-ink">{o.order_number}</Link></td>
                  <td className="hidden py-2.5 sm:table-cell">{o.customer_name}</td>
                  <td className="py-2.5"><Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</Badge></td>
                  <td className="py-2.5 text-right font-semibold">{formatINR(o.grand_total)}</td>
                </tr>
              ))}
              {!recent?.length && <tr><td className="py-6 text-muted">No orders yet.</td></tr>}
            </tbody>
          </table>
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold">Bestsellers</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {stats.bestsellers.map((b, i) => (
                <li key={b.product_id ?? i} className="flex justify-between gap-3"><span className="truncate">{i + 1}. {b.name}</span><span className="shrink-0 text-muted">{b.units} sold</span></li>
              ))}
              {!stats.bestsellers.length && <li className="text-muted">No sales in this range.</li>}
            </ol>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Low stock</h2><Link href={shopHref("/admin/inventory?filter=low")} className="text-sm font-semibold text-accent-ink">Inventory</Link></div>
            <ul className="mt-3 space-y-2 text-sm">
              {stats.low_stock.map((v) => (
                <li key={v.variant_id} className="flex justify-between gap-3">
                  <Link href={shopHref(`/admin/products/${v.product_id}`)} className="truncate hover:text-accent-ink">{v.name}{v.title !== "Default" ? ` — ${v.title}` : ""}</Link>
                  <span className={`shrink-0 font-semibold ${v.stock === 0 ? "text-danger" : "text-warning"}`}>{v.stock === 0 ? "Out" : `${v.stock} left`}</span>
                </li>
              ))}
              {!stats.low_stock.length && <li className="text-muted">All stocked up.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Work({ href, icon, label, n, tone }: { href: string; icon: React.ReactNode; label: string; n: number; tone?: "danger" }) {
  return (
    <Link href={shopHref(href)} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone ? "bg-red-50 text-danger" : "bg-paper-2 text-accent-ink"}`}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-2xl font-extrabold">{n}</span>
    </Link>
  );
}
