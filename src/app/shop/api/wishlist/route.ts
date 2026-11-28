import { z } from "zod";
import { body, json, route } from "@/shop/server/http";
import { toggleWishlist, wishlistIds } from "@/shop/server/wishlist";

export const dynamic = "force-dynamic";

export const GET = route(async () => json({ ids: await wishlistIds() }));

export const POST = route(
  async (req) => {
    const { productId, on } = z.object({ productId: z.uuid(), on: z.boolean() }).parse(await body(req));
    await toggleWishlist(productId, on);
    return json({ ids: await wishlistIds() });
  },
  { rate: ["wishlist", 60, 60_000] },
);
