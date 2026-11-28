import { placeOrder } from "@/shop/server/checkout";
import { body, json, route } from "@/shop/server/http";
import { checkoutSchema } from "@/shop/lib/validation";

export const dynamic = "force-dynamic";

/** Places the order: re-prices the cart on the server, reserves stock atomically and starts payment. */
export const POST = route(
  async (req, { ip }) => {
    const input = checkoutSchema.parse(await body(req, 64 * 1024));
    const result = await placeOrder(input, ip);
    return json(result, 201);
  },
  { rate: ["checkout", 10, 10 * 60_000] },
);
