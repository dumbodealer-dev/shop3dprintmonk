import { z } from "zod";
import { getCustomer } from "@/shop/server/auth/customer";
import { addToCart, getCartView } from "@/shop/server/cart";
import { ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { getOrderForViewer } from "@/shop/server/orders";
import { publicCart } from "@/shop/server/serialize";

/** "Buy again": adds every still-available item from a past order to the cart. */
export const POST = route(
  async (req) => {
    const { orderNumber, key } = z.object({ orderNumber: z.string().max(20), key: z.string().max(100).nullable().optional() }).parse(await body(req));
    const customer = await getCustomer();
    const order = await getOrderForViewer(orderNumber, key, customer?.id ?? null);
    if (!order) throw new ShopError("Order not found.", 404);
    const skipped: string[] = [];
    for (const i of order.items) {
      if (!i.variant_id) { skipped.push(i.product_name); continue; }
      // Personalised items need fresh input, so they're re-added without personalisation only when it's optional.
      await addToCart(i.variant_id, i.quantity, {}).catch(() => skipped.push(i.product_name));
    }
    return json({ cart: publicCart(await getCartView()), skipped });
  },
  { rate: ["reorder", 10, 10 * 60_000] },
);
