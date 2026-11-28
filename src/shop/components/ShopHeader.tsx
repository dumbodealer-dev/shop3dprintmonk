"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { mainSiteHref, shopHref } from "@/shop/config";
import { api } from "./api";
import { SearchBar } from "./SearchBar";
import { useShop } from "./ShopProvider";

export type NavCategory = { slug: string; name: string; children: { slug: string; name: string }[] };

export function ShopHeader({ categories, strip }: { categories: NavCategory[]; strip: string | null }) {
  const { cart, setDrawerOpen, wishlist } = useShop();
  const [viewer, setViewer] = useState<{ firstName: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenu(false);
  }

  useEffect(() => {
    api<{ customer: { firstName: string } | null }>("/session")
      .then((r) => setViewer(r.customer))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  const count = cart?.itemCount ?? 0;
  return (
    <header className="sticky top-0 z-40 bg-ink-900 text-white shadow-[0_1px_0_rgb(255_255_255/0.05)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-text">
        Skip to content
      </a>
      <div className="border-b border-white/5 bg-ink-950">
        <div className="container-x flex h-9 items-center justify-between gap-4 text-xs text-ink-300">
          <p className="truncate">{strip ?? "Printed to order in Delhi · Shipping across India"}</p>
          <a href={mainSiteHref("/")} className="hidden shrink-0 items-center gap-1 hover:text-white sm:inline-flex">
            3dprintmonk.com — custom printing & quotes <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="container-x flex h-16 items-center gap-2 sm:gap-3 lg:h-[72px] lg:gap-6">
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}>
          <Menu className="h-5 w-5" />
        </button>
        <Link href={shopHref("/")} aria-label="3D PRINTMONK Shop — home" className="flex min-w-0 shrink items-center gap-2 overflow-hidden">
          <Logo priority />
          <span className="hidden rounded-full bg-accent px-2 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-widest text-ink-950 sm:inline">Shop</span>
        </Link>
        <SearchBar className="hidden flex-1 md:block" />
        <nav aria-label="Account and cart" className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link href={shopHref(viewer ? "/account" : "/account/login")} className="inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm hover:bg-white/5 sm:px-3" aria-label={viewer ? `Your account (${viewer.firstName})` : "Sign in"}>
            <User className="h-5 w-5" />
            <span className="hidden xl:inline">{viewer ? `Hi, ${viewer.firstName}` : "Sign in"}</span>
          </Link>
          <Link href={shopHref("/wishlist")} className="relative hidden h-10 w-10 items-center justify-center sm:inline-flex rounded-full hover:bg-white/5" aria-label={`Wishlist (${wishlist.size})`}>
            <Heart className="h-5 w-5" />
            {wishlist.size > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
          <button type="button" onClick={() => setDrawerOpen(true)} className="relative inline-flex h-10 items-center gap-2 rounded-full bg-accent px-3.5 font-semibold text-ink-950 hover:bg-accent-soft" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm tabular-nums">{count}</span>
          </button>
        </nav>
      </div>
      <div className="container-x pb-3 md:hidden">
        <SearchBar />
      </div>
      <nav aria-label="Shop categories" className="hidden border-t border-white/5 lg:block">
        <ul className="container-x flex h-12 items-center gap-1 text-sm">
          <li><NavItem href={shopHref("/products")}>All products</NavItem></li>
          {categories.map((c) => (
            <li key={c.slug} className="group relative">
              <NavItem href={shopHref(`/category/${c.slug}`)}>
                {c.name} {c.children.length > 0 && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </NavItem>
              {c.children.length > 0 && (
                <div className="invisible absolute left-0 top-full z-50 min-w-52 translate-y-1 rounded-2xl border border-line bg-white p-2 text-text opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {c.children.map((k) => (
                    <Link key={k.slug} href={shopHref(`/category/${k.slug}`)} className="block rounded-xl px-3 py-2 hover:bg-paper">{k.name}</Link>
                  ))}
                </div>
              )}
            </li>
          ))}
          <li><NavItem href={shopHref("/products?sort=newest")}>New arrivals</NavItem></li>
          <li><NavItem href={shopHref("/products?sale=1")}><span className="text-accent">Offers</span></NavItem></li>
          <li className="ml-auto"><NavItem href={mainSiteHref("/get-a-quote")}>Custom print? Get a quote</NavItem></li>
        </ul>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Shop menu">
          <button type="button" className="absolute inset-0 bg-ink-950/70" onClick={() => setMenu(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto bg-ink-900 px-5 pb-10 pt-4">
            <div className="flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setMenu(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-6 divide-y divide-ink-700">
              <li><MobileLink href={shopHref("/products")}>All products</MobileLink></li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <MobileLink href={shopHref(`/category/${c.slug}`)}>{c.name}</MobileLink>
                  {c.children.length > 0 && (
                    <ul className="mb-2 pl-3">
                      {c.children.map((k) => <li key={k.slug}><Link href={shopHref(`/category/${k.slug}`)} className="block py-2 text-ink-300 hover:text-white">{k.name}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
              <li><MobileLink href={shopHref("/products?sort=newest")}>New arrivals</MobileLink></li>
              <li><MobileLink href={shopHref("/products?sale=1")}>Offers</MobileLink></li>
              <li><MobileLink href={shopHref("/wishlist")}>Wishlist</MobileLink></li>
              <li><MobileLink href={shopHref(viewer ? "/account" : "/account/login")}>{viewer ? "My account" : "Sign in / Register"}</MobileLink></li>
            </ul>
            <a href={mainSiteHref("/")} className="mt-8 flex items-center gap-1 text-sm text-ink-300 hover:text-white">Visit 3dprintmonk.com <ArrowUpRight className="h-4 w-4" /></a>
          </div>
        </div>
      )}
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-ink-200 transition hover:bg-white/5 hover:text-white">{children}</Link>;
}
function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block py-3 text-lg font-semibold text-white">{children}</Link>;
}
