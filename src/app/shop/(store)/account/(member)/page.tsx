import Link from "next/link";
import { redirect } from "next/navigation";
import { ResendVerification } from "@/shop/components/account/AccountClient";
import { Badge, Notice, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, statusTone } from "@/shop/lib/order-status";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { listCustomerOrders } from "@/shop/server/orders";

export const metadata = noIndex("My account");

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ welcome?: string; reset?: string }> }) {
  const customer = await getCustomer();
  if (!customer) redirect(shopHref("/account/login"));
  const [sp, orders] = await Promise.all([searchParams, listCustomerOrders(customer.id)]);
  const active = orders.filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status));
  return (
    <div className="space-y-6">
      <h1 className="h-section">Hi, {customer.fullName.split(" ")[0]}</h1>
      {sp.welcome && <Notice tone="success">Welcome to the 3D PRINTMONK Shop! We&apos;ve emailed you a link to confirm your address.</Notice>}
      {sp.reset && <Notice tone="success">Your password has been changed.</Notice>}
      {!customer.emailVerified && <Notice tone="warning">Please confirm your email address ({customer.email}). <ResendVerification /></Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="In progress" value={String(active.length)} />
        <Stat label="Member since" value={new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} />
      </div>
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link href={shopHref("/account/orders")} className="text-sm font-semibold text-accent-ink hover:underline">View all</Link>
        </div>
        {orders.length ? (
          <ul className="mt-4 divide-y divide-line">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={shopHref(`/account/orders/${o.order_number}`)} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-accent-ink">
                  <span><span className="font-mono text-sm font-semibold">{o.order_number}</span> <span className="text-sm text-muted">· {new Date(o.created_at).toLocaleDateString("en-IN")}</span></span>
                  <span className="flex items-center gap-3"><Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status]}</Badge><span className="font-semibold">{formatINR(o.grand_total)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No orders yet. <Link href={shopHref("/products")} className="font-semibold text-accent-ink underline">Start shopping</Link></p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>;
}
