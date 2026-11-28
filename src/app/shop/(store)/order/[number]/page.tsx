import Link from "next/link";
import { notFound } from "next/navigation";
import { shopHref } from "@/shop/config";
import { OrderDetail } from "@/shop/components/account/OrderDetail";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { getOrderForViewer } from "@/shop/server/orders";
import { shopConfigured } from "@/shop/server/db";

export const metadata = noIndex("Your order");
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string; placed?: string }> };

/** Order confirmation & tracking. Visible to the signed-in owner, or via the secret link emailed to the customer. */
export default async function OrderPage({ params, searchParams }: Props) {
  if (!shopConfigured()) notFound();
  const [{ number }, sp, customer] = await Promise.all([params, searchParams, getCustomer()]);
  const order = await getOrderForViewer(number, sp.key ?? null, customer?.id ?? null);
  if (!order) notFound();
  const ownedBySignedIn = !!customer && order.customer_id === customer.id;
  return (
    <div className="container-x py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-section">{sp.placed ? "Order confirmation" : "Order details"}</h1>
        {ownedBySignedIn && <Link href={shopHref("/account/orders")} className="text-sm font-semibold text-accent-ink hover:underline">All my orders</Link>}
      </div>
      <OrderDetail order={order} accessKey={ownedBySignedIn ? null : (sp.key ?? null)} justPlaced={!!sp.placed} />
    </div>
  );
}
