import { getProduct } from "@/shop/server/catalog";
import { json, route } from "@/shop/server/http";

/** Product data for the quick-view dialog. */
export const GET = route(async (req) => {
  const slug = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const product = await getProduct(decodeURIComponent(slug));
  if (!product) return json({ error: "Product not found" }, 404);
  return json({ product }, 200, { "Cache-Control": "public, max-age=30" });
});
