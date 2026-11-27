import { CircleCheck } from "lucide-react";
import { business } from "@/config/business";
import { pageMetadata } from "@/lib/seo";
import { REFERENCE_PATTERN } from "@/lib/reference";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";

export const metadata = pageMetadata({
  title: "Enquiry received",
  description: "Thank you — your 3D PRINTMONK enquiry has been received.",
  path: "/get-a-quote/thank-you",
  noIndex: true,
});

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const reference = ref && REFERENCE_PATTERN.test(ref) ? ref : null;

  return (
    <section className="dark-band tech-grid">
      <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <CircleCheck className="h-14 w-14 text-accent" aria-hidden="true" />
        <h1 className="h-section mt-6">Thank you — we&apos;ve received your enquiry</h1>
        {reference && (
          <div className="mt-8 rounded-2xl border border-ink-600 bg-ink-850 px-8 py-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-300">Your reference number</p>
            <p className="mt-2 whitespace-nowrap font-mono text-2xl font-semibold tracking-wider text-white sm:text-4xl">{reference}</p>
          </div>
        )}
        <p className="lead mt-8 max-w-xl">
          Our team will review your requirements and get back to you with questions or a quotation.
          {reference && " A confirmation has been sent to your email — please quote the reference number in any follow-up."}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <WhatsAppLink context={reference ? `Hello ${business.name}, my enquiry reference is ${reference}. I'd like to add some details.` : "general"} label="Discuss on WhatsApp" size="lg" />
          <ButtonLink href="/our-work" variant="outline-dark" size="lg">Explore our work</ButtonLink>
          <ButtonLink href="/" variant="outline-dark" size="lg">Back to home</ButtonLink>
        </div>
      </div>
    </section>
  );
}
