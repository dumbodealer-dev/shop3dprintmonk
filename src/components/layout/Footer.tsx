import Link from "next/link";
import { SHOP_ENTRY_HREF } from "@/shop/config";
import { Mail, MapPin, Phone } from "lucide-react";
import { business } from "@/config/business";
import { services } from "@/content/services";
import { defaultMaterials } from "@/content/materials";
import { Logo } from "@/components/ui/Logo";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { whatsappLink } from "@/lib/whatsapp";
import { formatAddress, formatPhone } from "@/lib/format";

export function Footer() {
  const wa = whatsappLink("general");
  const address = formatAddress();
  const year = new Date().getFullYear();
  const materialLinks = defaultMaterials.filter((m) => ["pla", "petg", "abs", "tpu", "standard-resin", "tough-resin"].includes(m.slug));

  return (
    <footer className="dark-band border-t border-ink-700">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-300">
            Custom FDM and SLA 3D printing, design and finishing — from a single prototype to bulk production. Based in{" "}
            {business.address.city}, serving {business.serviceArea.primary} — {business.serviceArea.secondary}.
          </p>
          <div className="mt-6 flex gap-3">
            {business.social.instagram && (
              <a href={business.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="3D PRINTMONK on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 hover:border-accent hover:text-accent">
                <InstagramIcon className="h-5 w-5" />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat with 3D PRINTMONK on WhatsApp" data-wa-context="footer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-ink-300 hover:border-[#25d366] hover:text-[#5be08f]">
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        <FooterCol title="Services">
          {services.map((s) => (
            <FooterLink key={s.slug} href={`/services/${s.slug}`}>{s.name}</FooterLink>
          ))}
          <FooterLink href="/get-a-quote">Get a Quote</FooterLink>
          <FooterLink href={SHOP_ENTRY_HREF}>Shop</FooterLink>
        </FooterCol>

        <FooterCol title="Materials">
          {materialLinks.map((m) => (
            <FooterLink key={m.slug} href={`/materials/${m.slug}`}>{m.name}</FooterLink>
          ))}
          <FooterLink href="/materials">All materials</FooterLink>
        </FooterCol>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-300">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-200">
            {business.contact.phone && (
              <li><a href={`tel:${business.contact.phone}`} className="inline-flex items-center gap-2.5 hover:text-accent"><Phone className="h-4 w-4 text-accent" />{formatPhone(business.contact.phone)}</a></li>
            )}
            {business.contact.email && (
              <li><a href={`mailto:${business.contact.email}`} className="inline-flex items-center gap-2.5 break-all hover:text-accent"><Mail className="h-4 w-4 shrink-0 text-accent" />{business.contact.email}</a></li>
            )}
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{address ?? `${business.address.city}, India`}</span></li>
          </ul>
          <ul className="mt-6 space-y-2 text-sm">
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/blog">Blog &amp; guides</FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-700">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ink-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {business.legalName ?? business.name}. All rights reserved.</p>
          <ul className="flex gap-5">
            <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-300">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-ink-200 transition hover:text-accent">{children}</Link>
    </li>
  );
}
