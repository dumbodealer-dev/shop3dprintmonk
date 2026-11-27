import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { business } from "@/config/business";
import { integrations } from "@/lib/env";
import { formatAddress, formatPhone } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata = pageMetadata({
  title: "Contact 3D PRINTMONK — 3D Printing in Delhi",
  description: "Contact 3D PRINTMONK in Delhi for 3D printing quotes, bulk orders and design help. Phone, WhatsApp, email and contact form.",
  path: "/contact",
});

export default function ContactPage() {
  const { contact, address, hours } = business;
  const fullAddress = formatAddress();
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to us about your project"
        lead="For a quotation, the quote form is fastest — it lets you attach your files. For anything else, reach us here."
        crumbs={[{ href: "/contact", label: "Contact" }]}
      >
        <ButtonLink href="/get-a-quote" size="lg" data-track="cta_get_quote" data-track-location="contact_hero">Get a Quote</ButtonLink>
        <WhatsAppLink context="contact" variant="outline-dark" size="lg" />
      </PageHero>

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            {contact.phone && (
              <ContactCard icon={Phone} title="Phone">
                <a href={`tel:${contact.phone}`} data-track-location="contact_page" className="text-lg font-semibold hover:text-accent-ink">{formatPhone(contact.phone)}</a>
              </ContactCard>
            )}
            {contact.email && (
              <ContactCard icon={Mail} title="Email">
                <a href={`mailto:${contact.email}`} data-track-location="contact_page" className="break-all text-lg font-semibold hover:text-accent-ink">{contact.email}</a>
              </ContactCard>
            )}
            <ContactCard icon={MapPin} title="Location">
              <p className="font-semibold">{fullAddress ?? `${address.city}, India`}</p>
              <p className="mt-1 text-sm text-muted">Serving {business.serviceArea.primary} · {business.serviceArea.secondary}</p>
              {address.walkInsWelcome === false && <p className="mt-1 text-sm text-muted">Visits by appointment only.</p>}
              {address.mapsUrl && <a href={address.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent-ink underline underline-offset-4">Open in Google Maps</a>}
            </ContactCard>
            {hours.length > 0 && (
              <ContactCard icon={Clock} title="Business hours">
                <dl className="space-y-1 text-[0.95rem]">
                  {hours.map((h) => (
                    <div key={h.days} className="flex justify-between gap-4"><dt className="text-muted">{h.days}</dt><dd className="font-medium">{h.hours}</dd></div>
                  ))}
                </dl>
              </ContactCard>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Send us a message</h2>
            <div className="mt-6"><ContactForm configured={integrations.database} /></div>
          </div>
        </div>
        {address.mapsEmbedUrl && (
          <div className="container-x mt-12">
            <iframe
              src={address.mapsEmbedUrl}
              title={`Map showing ${business.name} location`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-80 w-full rounded-[var(--radius-card)] border border-line"
            />
          </div>
        )}
      </section>
    </>
  );
}

function ContactCard({ icon: Icon, title, children }: { icon: typeof Phone; title: string; children: React.ReactNode }) {
  return (
    <div className="card flex gap-4 p-5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">{title}</p><div className="mt-1">{children}</div></div>
    </div>
  );
}
