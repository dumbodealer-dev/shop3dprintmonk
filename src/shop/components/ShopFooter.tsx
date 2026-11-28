import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { mainSiteHref, shopHref } from "@/shop/config";
import type { ShopSettings } from "@/shop/lib/settings-schema";
import type { NavCategory } from "./ShopHeader";

export function ShopFooter({ settings, categories }: { settings: ShopSettings; categories: NavCategory[] }) {
  const s = settings.store;
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello 3D PRINTMONK, I have a question about the shop.")}` : null;
  return (
    <footer className="dark-band tech-grid mt-20 border-t border-ink-700">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">
            Functional, decorative and personalised 3D printed products — designed, printed and finished in our own print farm in Delhi.
          </p>
          <div className="mt-5 flex gap-2">
            {s.instagram && (
              <a href={s.instagram} target="_blank" rel="noopener noreferrer" aria-label="3D PRINTMONK on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 hover:border-accent hover:text-accent">
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 hover:border-[#25d366] hover:text-[#5be08f]">
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <FooterCol title="Shop">
          <FooterLink href={shopHref("/products")}>All products</FooterLink>
          {categories.slice(0, 5).map((c) => <FooterLink key={c.slug} href={shopHref(`/category/${c.slug}`)}>{c.name}</FooterLink>)}
          <FooterLink href={shopHref("/products?sale=1")}>Offers</FooterLink>
        </FooterCol>
        <FooterCol title="Help">
          <FooterLink href={shopHref("/account/orders")}>Track your order</FooterLink>
          <FooterLink href={shopHref("/policies/shipping")}>Shipping policy</FooterLink>
          <FooterLink href={shopHref("/policies/returns-refunds")}>Returns & refunds</FooterLink>
          <FooterLink href={shopHref("/policies/terms")}>Terms & conditions</FooterLink>
          <FooterLink href={shopHref("/policies/privacy")}>Privacy policy</FooterLink>
          <FooterLink href={mainSiteHref("/get-a-quote")}>Custom printing quote</FooterLink>
        </FooterCol>
        <FooterCol title="Contact">
          {s.phone && <li><a href={`tel:${s.phone}`} className="inline-flex items-center gap-2 text-ink-200 hover:text-accent"><Phone className="h-4 w-4 text-accent" />{s.phone}</a></li>}
          {(s.supportEmail || s.email) && <li><a href={`mailto:${s.supportEmail || s.email}`} className="inline-flex items-center gap-2 break-all text-ink-200 hover:text-accent"><Mail className="h-4 w-4 shrink-0 text-accent" />{s.supportEmail || s.email}</a></li>}
          {s.addressLine && <li className="flex gap-2 text-ink-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{s.addressLine}, {s.city} {s.pincode}</span></li>}
        </FooterCol>
      </div>
      <div className="border-t border-ink-700">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {s.legalName || "3D PRINTMONK"}. Prices in INR, inclusive of GST.{s.gstin ? ` GSTIN ${s.gstin}.` : ""}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Secure payments: UPI · Cards · Net banking · Wallets{settings.payments.codEnabled ? " · COD" : ""}</span>
            <a href={mainSiteHref("/")} className="hover:text-white">3dprintmonk.com</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <li><Link href={href} className="text-ink-200 transition hover:text-accent">{children}</Link></li>;
}
