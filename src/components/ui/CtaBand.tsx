import { ArrowRight } from "lucide-react";
import { ButtonLink } from "./Button";
import { WhatsAppLink } from "./WhatsAppLink";
import type { WhatsAppContext } from "@/lib/whatsapp";
import { Floating3D } from "@/components/three/Floating3D";

export function CtaBand({
  title = "Have a Project in Mind?",
  text = "Send us your design or explain what you need. Our team will review your requirements and help you choose the right printing solution.",
  quoteHref = "/get-a-quote",
  quoteLabel = "Request a Quote",
  whatsapp = "general",
  location = "cta_band",
}: {
  title?: string;
  text?: string;
  quoteHref?: string;
  quoteLabel?: string;
  whatsapp?: WhatsAppContext;
  location?: string;
}) {
  return (
    <section className="bg-paper py-16 sm:py-20" aria-labelledby={`cta-${location}`}>
      <div className="container-x">
        <div className="dark-band tech-grid relative overflow-hidden rounded-[1.75rem] px-6 py-12 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
          <Floating3D shape="cube" size={110} className="absolute right-16 top-12 hidden lg:block" />
          <Floating3D shape="pyramid" size={80} className="absolute bottom-10 right-56 hidden lg:block" delay={-5} speed={14} />
          <Floating3D shape="layers" size={90} className="absolute right-6 bottom-6 hidden md:block lg:right-10" delay={-2} />
          <div className="relative max-w-2xl">
            <h2 id={`cta-${location}`} className="h-section">{title}</h2>
            <p className="lead mt-4">{text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={quoteHref} size="lg" data-track="cta_get_quote" data-track-location={location}>
                {quoteLabel} <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <WhatsAppLink context={whatsapp} label="Contact on WhatsApp" variant="outline-dark" size="lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
