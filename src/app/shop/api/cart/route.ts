import { z } from "zod";
import { addToCart, getCartView, setSavedForLater, updateCartItem } from "@/shop/server/cart";
import { body, json, route } from "@/shop/server/http";
import { publicCart } from "@/shop/server/serialize";
import { cartAddSchema, cartUpdateSchema } from "@/shop/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => json(publicCart(await getCartView())));

/** Add an item. Price, stock and personalisation are validated on the server. */
export const POST = route(
  async (req) => {
    const input = cartAddSchema.parse(await body(req));
    await addToCart(input.variantId, input.quantity, input.customization);
    return json(publicCart(await getCartView()));
  },
  { rate: ["cart", 60, 60_000] },
);

const patchSchema = z.union([cartUpdateSchema, z.object({ itemId: z.uuid(), savedForLater: z.boolean() })]);

/** Change quantity (0 removes) or move between cart and "saved for later". */
export const PATCH = route(
  async (req) => {
    const input = patchSchema.parse(await body(req));
    if ("savedForLater" in input) await setSavedForLater(input.itemId, input.savedForLater);
    else await updateCartItem(input.itemId, input.quantity);
    return json(publicCart(await getCartView()));
  },
  { rate: ["cart", 60, 60_000] },
);
