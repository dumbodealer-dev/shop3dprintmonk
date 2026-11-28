import { shopUrl } from "@/shop/config";

/** Served as /robots.txt on the shop subdomain (via src/proxy.ts). */
export function GET() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /account", "Disallow: /checkout", "Disallow: /cart", "Disallow: /order/", "Disallow: /api/", `Sitemap: ${shopUrl("/sitemap.xml")}`].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
