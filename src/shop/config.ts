/**
 * Shop routing & domain configuration (safe for browser and server).
 *
 * Today the shop is served from the main site under /shop. To move it to its own
 * subdomain later (e.g. https://shop.3dprintmonk.com) set, in that deployment:
 *   NEXT_PUBLIC_SHOP_URL=https://shop.3dprintmonk.com
 *   NEXT_PUBLIC_SHOP_BASE_PATH=            (empty: links become /products, /cart …)
 *   SHOP_HOST=shop.3dprintmonk.com         (src/proxy.ts maps that host onto the /shop routes)
 * No domain is hard-coded anywhere else in the shop.
 */
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.3dprintmonk.com").replace(/\/$/, "");

const rawBase = process.env.NEXT_PUBLIC_SHOP_BASE_PATH;
/** Public URL prefix for shop links ("/shop" now, "" on the subdomain). */
export const SHOP_BASE = (rawBase === undefined ? "/shop" : rawBase).replace(/\/$/, "");

/** Absolute public URL of the storefront (canonical links, emails, payment callbacks). */
export const SHOP_URL = (process.env.NEXT_PUBLIC_SHOP_URL || `${siteUrl}${SHOP_BASE}`).replace(/\/$/, "");

/** Main 3D PRINTMONK website (the shop links back to it). */
export const MAIN_SITE_URL = siteUrl;

/** Internal route prefix (the folder in src/app). Never changes. */
export const SHOP_ROUTE = "/shop";

/** Link to a shop page, e.g. shopHref("/cart") → "/shop/cart" (or "/cart" on the subdomain). */
export function shopHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") return SHOP_BASE || "/";
  return `${SHOP_BASE}${p}`;
}

/** Absolute URL of a shop page (for emails, canonical tags, structured data). */
export function shopUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? SHOP_URL : `${SHOP_URL}${p}`;
}

/** Link to the main website. Relative when both live on the same host. */
export function mainSiteHref(path = "/"): string {
  return SHOP_BASE ? path : `${MAIN_SITE_URL}${path}`;
}

/** Where the main website's "Shop" button points. */
export const SHOP_ENTRY_HREF = process.env.NEXT_PUBLIC_SHOP_URL && !SHOP_BASE ? SHOP_URL : shopHref("/");

export const CURRENCY = "INR" as const;
