import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrderDetail } from "@/shop/components/account/OrderDetail";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { getOrderForViewer } from "@/shop/server/orders";

export const metadata = noIndex("Order details");

export default async function AccountOrder({ params }: { params: Promise<{ number: string }> }) {
  const customer = await getCustomer();
  if (!customer) redirect(shopHref("/account/login?next=/account/orders"));
  const order = await getOrderForViewer((await params).number, null, customer.id);
  if (!order) notFound();
  return (
    <div>
      <Link href={shopHref("/account/orders")} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <h1 className="h-section mb-6">Order {order.order_number}</h1>
      <OrderDetail order={order} accessKey={null} />
    </div>
  );
}
