import { z } from "zod";
import { getCustomer } from "@/shop/server/auth/customer";
import { ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { getOrderForViewer } from "@/shop/server/orders";
import { publicShipments } from "@/shop/server/shipping/public";
import { syncOrderTracking } from "@/shop/server/shipping/tracking";

export const dynamic = "force-dynamic";

/** Customer "Refresh tracking": re-syncs with Delhivery at most every 10 minutes per shipment, then returns the latest. */
export const POST = route(
  async (req) => {
    const { orderNumber, key } = z.object({ orderNumber: z.string().max(20), key: z.string().max(100).nullable().optional() }).parse(await body(req));
    const customer = await getCustomer();
    const order = await getOrderForViewer(orderNumber, key, customer?.id ?? null);
    if (!order) throw new ShopError("Order not found.", 404);
    await syncOrderTracking(order.id, 10);
    const fresh = await getOrderForViewer(orderNumber, key, customer?.id ?? null);
    return json({ shipments: publicShipments(fresh?.shipments ?? []), status: fresh?.status });
  },
  { rate: ["track", 20, 10 * 60_000] },
);
