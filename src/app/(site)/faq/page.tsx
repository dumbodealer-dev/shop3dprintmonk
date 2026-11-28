import { ChevronDown } from "lucide-react";
import { faqs } from "@/content/faq";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";

export const metadata = pageMetadata({
  title: "3D Printing FAQ — Files, Materials, Cost, Delivery & More",
  description: "Answers to common questions about 3D printing with 3D PRINTMONK: file formats, FDM vs SLA, materials, pricing, bulk orders, finishing, delivery and GST invoices.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Frequently asked questions" lead="Quick answers about files, materials, pricing and delivery. Can't find what you need? Ask us." crumbs={[{ href: "/faq", label: "FAQ" }]} />
      <section className="section">
        <div className="container-x max-w-3xl">
          <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left font-semibold hover:bg-paper sm:px-6 [&::-webkit-details-marker]:hidden">
                  <h2 className="text-base sm:text-lg">{f.q}</h2>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-6 leading-relaxed text-muted sm:px-6">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <CtaBand title="Still have a question?" text="Send us your file or describe your project and we'll answer anything specific to your part." location="faq" />
    </>
  );
}
