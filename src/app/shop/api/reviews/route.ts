import { getCustomer } from "@/shop/server/auth/customer";
import { db, ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { reviewSchema } from "@/shop/lib/validation";

/** Signed-in customers can review a product once. Reviews are published after moderation. */
export const POST = route(
  async (req) => {
    const customer = await getCustomer();
    if (!customer) throw new ShopError("Please sign in to write a review.", 401);
    const input = reviewSchema.parse(await body(req));
    const { data: product } = await db().from("shop_products").select("id").eq("id", input.productId).eq("status", "active").maybeSingle();
    if (!product) throw new ShopError("Product not found.", 404);
    // Verified purchase = a paid or delivered order containing this product.
    const { data: bought } = await db()
      .from("shop_order_items")
      .select("id, order:shop_orders!inner (customer_id, payment_status)")
      .eq("product_id", input.productId)
      .eq("order.customer_id", customer.id)
      .in("order.payment_status", ["paid", "cod_pending"])
      .limit(1);
    const { error } = await db().from("shop_reviews").insert({
      product_id: input.productId,
      customer_id: customer.id,
      author_name: customer.fullName.split(" ")[0] + (customer.fullName.split(" ")[1] ? ` ${customer.fullName.split(" ")[1][0]}.` : ""),
      rating: input.rating,
      title: input.title,
      body: input.body,
      verified_purchase: !!bought?.length,
    });
    if (error?.code === "23505") throw new ShopError("You've already reviewed this product.", 409);
    if (error) throw new ShopError("Couldn't save your review. Please try again.", 500);
    return json({ ok: true, message: "Thanks! Your review will appear once it's approved." }, 201);
  },
  { rate: ["review", 5, 60 * 60_000] },
);
