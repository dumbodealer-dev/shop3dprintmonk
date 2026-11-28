/**
 * Session cookie names. In production the browser-enforced prefixes are used:
 *  __Host-   admin session: Secure, path=/, never shared with any subdomain
 *  __Secure- customer session & guest cart: Secure (may be shared via SHOP_COOKIE_DOMAIN)
 * A subdomain can't overwrite these, which blocks cookie-injection / session-fixation tricks.
 * Kept free of server-only imports so src/proxy.ts can use it too.
 */
const prod = process.env.NODE_ENV === "production";
export const ADMIN_COOKIE = prod ? "__Host-pm_shop_admin" : "pm_shop_admin";
export const CUSTOMER_COOKIE = prod ? "__Secure-pm_shop_sid" : "pm_shop_sid";
export const GUEST_COOKIE = prod ? "__Secure-pm_shop_cart" : "pm_shop_cart";
