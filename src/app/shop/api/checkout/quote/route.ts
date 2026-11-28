import { z } from "zod";
import { checkoutQuote } from "@/shop/server/checkout";
import { body, json, route } from "@/shop/server/http";
import { publicCart } from "@/shop/server/serialize";
import { STATE_NAMES } from "@/shop/lib/india";

export const dynamic = "force-dynamic";

const schema = z.object({
  shippingMethod: z.string().max(30).optional(),
  state: z.enum(STATE_NAMES).optional().catch(undefined),
  pincode: z.string().regex(/^\d{6}$/).optional().catch(undefined),
  paymentMethod: z.enum(["razorpay", "cod"]).nullable().optional(),
  couponCode: z.string().trim().max(40).nullable().optional(),
  email: z.email().nullable().optional().catch(null),
});

/** Server-calculated totals for the checkout summary (the browser never calculates prices). */
export const POST = route(
  async (req) => {
    const q = await checkoutQuote(schema.parse(await body(req)));
    return json({ cart: publicCart(q.cart), service: q.service, methods: q.methods, cod: q.cod, razorpayAvailable: q.razorpayAvailable });
  },
  { rate: ["quote", 120, 60_000] },
);
