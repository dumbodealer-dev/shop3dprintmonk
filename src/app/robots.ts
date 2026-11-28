import type { MetadataRoute } from "next";
import { business } from "@/config/business";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/get-a-quote/thank-you", "/shop/admin", "/shop/account", "/shop/checkout", "/shop/cart", "/shop/order/", "/shop/api/"] },
      // Explicitly welcome search & AI assistants so the business can be cited in AI answers.
      {
        userAgent: ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: "/",
        disallow: ["/api/", "/shop/admin", "/shop/account", "/shop/checkout", "/shop/api/"],
      },
    ],
    sitemap: [`${business.siteUrl}/sitemap.xml`, `${business.siteUrl}/shop/sitemap.xml`],
    host: business.siteUrl,
  };
}
