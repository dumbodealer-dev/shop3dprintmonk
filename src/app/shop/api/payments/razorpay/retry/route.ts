import { z } from "zod";
import { getCustomer } from "@/shop/server/auth/customer";
import { startRazorpay } from "@/shop/server/checkout";
import { ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { getOrderForViewer } from "@/shop/server/orders";

/** Re-open payment for an unpaid order (from the order page or a payment-failed email). */
export const POST = route(
  async (req) => {
    const { orderNumber, key } = z.object({ orderNumber: z.string().max(20), key: z.string().max(100).nullable().optional() }).parse(await body(req));
    const customer = await getCustomer();
    const order = await getOrderForViewer(orderNumber, key, customer?.id ?? null);
    if (!order) throw new ShopError("Order not found.", 404);
    if (order.status !== "pending_payment") throw new ShopError(order.payment_status === "paid" ? "This order is already paid." : "This order can no longer be paid. Please place a new order.", 409);
    return json(await startRazorpay(order.id));
  },
  { rate: ["retry", 10, 10 * 60_000] },
);
