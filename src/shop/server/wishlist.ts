import "server-only";
import { db, must, ShopError, shopConfigured } from "./db";
import { getOwnerKey } from "./cart";

/** Wishlists use the same owner key as carts, so guests can save items and keep them after signing in. */
export async function wishlistIds(): Promise<string[]> {
  if (!shopConfigured()) return [];
  const owner = await getOwnerKey(false);
  if (!owner) return [];
  const { data } = await db().from("shop_wishlist_items").select("product_id").eq("owner_key", owner).order("created_at", { ascending: false }).limit(200);
  return (data ?? []).map((r) => r.product_id);
}

export async function toggleWishlist(productId: string, on: boolean) {
  const owner = (await getOwnerKey(true))!;
  if (on) {
    const { data: p } = await db().from("shop_products").select("id").eq("id", productId).eq("status", "active").maybeSingle();
    if (!p) throw new ShopError("Product not found.", 404);
    const { count } = await db().from("shop_wishlist_items").select("product_id", { count: "exact", head: true }).eq("owner_key", owner);
    if ((count ?? 0) >= 200) throw new ShopError("Your wishlist is full (200 items).", 422);
    must(await db().from("shop_wishlist_items").upsert({ owner_key: owner, product_id: productId }, { onConflict: "owner_key,product_id", ignoreDuplicates: true }), "wishlist");
  } else {
    must(await db().from("shop_wishlist_items").delete().eq("owner_key", owner).eq("product_id", productId), "wishlist");
  }
}
