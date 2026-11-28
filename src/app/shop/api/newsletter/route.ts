import { db } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { newsletterSchema } from "@/shop/lib/validation";

export const POST = route(
  async (req) => {
    const input = newsletterSchema.parse(await body(req));
    if (input.website) return json({ ok: true }); // honeypot: pretend success
    const { error } = await db().from("shop_newsletter").upsert({ email: input.email, status: "subscribed", source: "shop" }, { onConflict: "email" });
    if (error && error.code !== "23505") {
      console.error("[shop] newsletter:", error.message);
      return json({ error: "Couldn't subscribe right now. Please try again." }, 500);
    }
    return json({ ok: true });
  },
  { rate: ["newsletter", 5, 10 * 60_000] },
);
