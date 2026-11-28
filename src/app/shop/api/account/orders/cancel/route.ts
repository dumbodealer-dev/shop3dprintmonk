import { z } from "zod";
import { getCustomer } from "@/shop/server/auth/customer";
import { ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { cancelOrder, getOrderForViewer } from "@/shop/server/orders";
import { customerCanCancel } from "@/shop/lib/order-status";

/** Customers can cancel before production starts; paid orders are refunded automatically. */
export const POST = route(
  async (req) => {
    const { orderNumber, key, reason } = z.object({ orderNumber: z.string().max(20), key: z.string().max(100).nullable().optional(), reason: z.string().trim().max(300).optional() }).parse(await body(req));
    const customer = await getCustomer();
    const order = await getOrderForViewer(orderNumber, key, customer?.id ?? null);
    if (!order) throw new ShopError("Order not found.", 404);
    if (!customerCanCancel(order.status)) throw new ShopError("This order is already being made and can't be cancelled online. Please contact us.", 409);
    await cancelOrder(order.id, { actor: "customer", reason: reason || "Cancelled by customer", refund: true });
    return json({ ok: true });
  },
  { rate: ["cancel", 5, 60 * 60_000] },
);
