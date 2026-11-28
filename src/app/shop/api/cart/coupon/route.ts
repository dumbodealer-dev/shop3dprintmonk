import { z } from "zod";
import { getCartView, setCartCoupon } from "@/shop/server/cart";
import { body, json, route } from "@/shop/server/http";
import { publicCart } from "@/shop/server/serialize";

export const POST = route(
  async (req) => {
    const { code } = z.object({ code: z.string().trim().min(1).max(40) }).parse(await body(req));
    await setCartCoupon(code);
    return json(publicCart(await getCartView()));
  },
  { rate: ["coupon", 15, 10 * 60_000] }, // slows down code guessing
);

export const DELETE = route(async () => {
  await setCartCoupon(null);
  return json(publicCart(await getCartView()));
});
