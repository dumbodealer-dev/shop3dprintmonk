import Link from "next/link";
import { Download } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { Badge, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, PAYMENT_STATUS_LABEL, PAYMENT_STATUSES, statusTone, type OrderStatus, type PaymentStatus } from "@/shop/lib/order-status";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Orders" };

type SP = { q?: string; status?: string; payment?: string; from?: string; to?: string; review?: string; page?: string };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage("orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = db()
    .from("shop_orders")
    .select("id, order_number, customer_name, email, phone, status, payment_status, payment_method, grand_total, created_at, needs_review, shipping_address", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  const term = sp.q?.trim().replace(/[%,()*"\\]/g, "");
  if (term) {
    const digits = term.replace(/\D/g, "");
    q = q.or([`order_number.ilike.%${term}%`, `customer_name.ilike.%${term}%`, `email.ilike.%${term}%`, digits.length >= 4 ? `phone.ilike.%${digits.slice(-10)}%` : null].filter(Boolean).join(","));
  }
  const statuses = (sp.status ?? "").split(",").filter((s): s is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(s));
  if (statuses.length) q = q.in("status", statuses);
  if (sp.payment && (PAYMENT_STATUSES as readonly string[]).includes(sp.payment)) q = q.eq("payment_status", sp.payment);
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) q = q.gte("created_at", `${sp.from}T00:00:00+05:30`);
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) q = q.lte("created_at", `${sp.to}T23:59:59+05:30`);
  if (sp.review) q = q.eq("needs_review", true);
  const { data, count } = await q;
  const pages = Math.ceil((count ?? 0) / 50);
  const qs = (n: number) => shopHref(`/admin/orders?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page")), page: String(n) })}`);

  return (
    <>
      <PageTitle
        title="Orders"
        subtitle={`${count ?? 0} orders`}
        actions={<a href={shopHref(`/admin/api/export?kind=orders${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:bg-paper"><Download className="h-4 w-4" /> Export CSV</a>}
      />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Order no., name, email or phone" className="input h-10 w-72 py-0 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 w-48 py-0 text-sm"><option value="">All order statuses</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
        <select name="payment" defaultValue={sp.payment ?? ""} className="input h-10 w-44 py-0 text-sm"><option value="">All payments</option>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}</select>
        <input type="date" name="from" defaultValue={sp.from} className="input h-10 w-40 py-0 text-sm" aria-label="From date" />
        <input type="date" name="to" defaultValue={sp.to} className="input h-10 w-40 py-0 text-sm" aria-label="To date" />
        <button className="h-10 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white">Filter</button>
        <Link href={shopHref("/admin/orders")} className="inline-flex h-10 items-center px-3 text-sm text-muted">Reset</Link>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Ship to</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-paper/60">
                <td className="p-3"><Link href={shopHref(`/admin/orders/${o.id}`)} className="font-mono font-semibold hover:text-accent-ink">{o.order_number}</Link>{o.needs_review && <Badge tone="danger" className="ml-2">Review</Badge>}</td>
                <td className="p-3 text-muted">{new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</td>
                <td className="p-3">{o.customer_name}<span className="block text-xs text-muted">{o.email}</span></td>
                <td className="p-3 text-muted">{(o.shipping_address as { city: string; pincode: string }).city} {(o.shipping_address as { pincode: string }).pincode}</td>
                <td className="p-3"><Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</Badge></td>
                <td className="p-3"><Badge tone={statusTone(o.payment_status) as Tone}>{PAYMENT_STATUS_LABEL[o.payment_status as PaymentStatus]}</Badge><span className="block text-xs text-muted">{o.payment_method === "cod" ? "COD" : "Online"}</span></td>
                <td className="p-3 text-right font-semibold">{formatINR(o.grand_total)}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={7} className="p-10 text-center text-muted">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Pagination">
          {Array.from({ length: Math.min(pages, 30) }, (_, i) => i + 1).map((n) => <Link key={n} href={qs(n)} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm ${n === page ? "bg-ink-900 text-white" : "border border-line bg-white"}`}>{n}</Link>)}
        </nav>
      )}
    </>
  );
}
