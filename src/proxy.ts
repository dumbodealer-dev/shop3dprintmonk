import { NextResponse, type NextRequest } from "next/server";

/**
 * 1. Subdomain support for the Shop.
 *    When SHOP_HOST is set (e.g. "shop.3dprintmonk.com"), requests to that host are
 *    rewritten onto the /shop routes, so https://shop.3dprintmonk.com/products is
 *    served by src/app/shop/(store)/products. Other hosts are untouched, so the main
 *    website keeps working exactly as before. Optional SHOP_REDIRECT_MAIN=true sends
 *    old main-site /shop links to the subdomain.
 *
 * 2. Optimistic auth redirects (no database access here). Visitors without a session
 *    cookie are sent to the right login page before anything renders. This is only a
 *    convenience — every page, action and API route still verifies the session itself.
 */
const CUSTOMER_COOKIE = "pm_shop_sid";
const ADMIN_COOKIE = "pm_shop_admin";
const ACCOUNT_PUBLIC = ["/shop/account/login", "/shop/account/register", "/shop/account/forgot", "/shop/account/reset", "/shop/account/verify"];
const ADMIN_PUBLIC = ["/shop/admin/login", "/shop/admin/forgot", "/shop/admin/reset", "/shop/admin/setup", "/shop/admin/api"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export function proxy(request: NextRequest) {
  const shopHost = process.env.SHOP_HOST?.toLowerCase();
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;
  const onShopHost = !!shopHost && host === shopHost;

  // Internal route path (always starts with /shop for shop pages) and its public prefix.
  const internal = onShopHost && !under(pathname, "/shop") ? `/shop${pathname === "/" ? "" : pathname}` : pathname;
  const publicBase = onShopHost ? "" : "/shop";

  if (under(internal, "/shop/account") && !ACCOUNT_PUBLIC.some((p) => under(internal, p)) && !request.cookies.has(CUSTOMER_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `${publicBase}/account/login`;
    url.search = `?next=${encodeURIComponent(internal.slice(5) + search)}`;
    return NextResponse.redirect(url, 307);
  }
  if (under(internal, "/shop/admin") && !ADMIN_PUBLIC.some((p) => under(internal, p)) && !request.cookies.has(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `${publicBase}/admin/login`;
    url.search = "";
    return NextResponse.redirect(url, 307);
  }

  if (onShopHost) {
    if (internal === pathname) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = internal;
    return NextResponse.rewrite(url);
  }

  if (shopHost && process.env.SHOP_REDIRECT_MAIN === "true" && under(pathname, "/shop")) {
    return NextResponse.redirect(`https://${shopHost}${pathname.slice(5) || "/"}${search}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|images/|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$).*)"],
};
