import Link from "next/link";
import { mainNav } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";
import { NavDropdown } from "./NavDropdown";
import { business } from "@/config/business";
import { ShoppingBag } from "lucide-react";
import { SHOP_ENTRY_HREF } from "@/shop/config";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-text">
        Skip to content
      </a>
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px] xl:gap-6">
        <Link href="/" aria-label="3D PRINTMONK — home" className="shrink-0">
          <Logo priority />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {mainNav.map((item) =>
              "children" in item ? (
                <NavDropdown key={item.href} label={item.label} href={item.href} items={item.children} />
              ) : (
                <li key={item.href} className={item.href === "/" ? "hidden xl:block" : undefined}>
                  <NavLink href={item.href}>{item.label}</NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {business.open24x7 && (
            <span className="hidden items-center gap-1.5 rounded-full border border-ink-700 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-ink-200 xl:inline-flex">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              Open 24×7
            </span>
          )}
          <ButtonLink href={SHOP_ENTRY_HREF} variant="outline-dark" size="sm" className="border-accent/70 px-3 text-accent min-[400px]:px-4 lg:h-10 lg:px-5" aria-label="Shop 3D printed products" data-track="cta_shop" data-track-location="header">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" /> <span className="hidden min-[380px]:inline">Shop</span>
          </ButtonLink>
          <span className="hidden min-[400px]:block">
            <ButtonLink href="/get-a-quote" size="sm" className="lg:h-10 lg:px-5" data-track="cta_get_quote" data-track-location="header">
              Get a Quote
            </ButtonLink>
          </span>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
