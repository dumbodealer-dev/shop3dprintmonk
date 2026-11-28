import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { Badge, EmptyState, ProductPlaceholder, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, statusTone } from "@/shop/lib/order-status";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { listCustomerOrders } from "@/shop/server/orders";

export const metadata = noIndex("My orders");

export default async function OrdersPage() {
  const customer = await getCustomer();
  if (!customer) redirect(shopHref("/account/login?next=/account/orders"));
  const orders = await listCustomerOrders(customer.id);
  return (
    <div>
      <h1 className="h-section">My orders</h1>
      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState icon={<Package className="h-7 w-7" />} title="No orders yet" action={<Link href={shopHref("/products")} className="inline-flex h-12 items-center rounded-full bg-ink-900 px-7 font-semibold text-white">Start shopping</Link>} />
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={shopHref(`/account/orders/${o.order_number}`)} className="card flex flex-col gap-4 p-5 transition hover:shadow-md sm:flex-row sm:items-center">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((i, n) => (
                      <span key={n} className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-paper-2">
                        {i.image_url ? <Image src={i.image_url} alt="" fill sizes="56px" className="object-cover" /> : <ProductPlaceholder name={i.product_name} className="h-full w-full" />}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{o.order_number}</p>
                    <p className="truncate text-sm text-muted">{o.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}</p>
                    <p className="text-xs text-muted">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <span className="font-bold">{formatINR(o.grand_total)}</span>
                    <Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    <span className="text-xs text-muted">{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
