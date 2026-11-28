import { serviceBySlug } from "@/content/services";
import { pageMetadata } from "@/lib/seo";
import { InfoGrid, Section, ServiceLayout } from "@/components/services/ServiceLayout";
import { QuoteFormSection } from "@/components/forms/QuoteFormSection";

const service = serviceBySlug("custom-3d-design")!;
export const metadata = pageMetadata({ title: service.seoTitle, description: service.seoDescription, path: `/services/${service.slug}` });

export default function DesignPage() {
  return (
    <ServiceLayout
      service={service}
      quoteHref="#design-enquiry"
      title="Custom 3D design — from idea to print-ready model"
      lead="Don't have a 3D file? Share what you have — a photo, sketch, drawing, existing part or just an idea — and we'll help create a model that's ready to print."
    >
      <Section eyebrow="What you can send" title="Start from whatever you have">
        <InfoGrid
          items={[
            { title: "Reference images", text: "Photos of an object from several angles, ideally with a ruler or known dimension in view." },
            { title: "Sketches", text: "Hand drawings with rough dimensions are a great starting point for simple parts." },
            { title: "Existing physical parts", text: "Broken or discontinued parts can often be measured and remodelled as replacements." },
            { title: "CAD files", text: "Send existing CAD to modify, repair, scale or prepare for printing." },
            { title: "Technical drawings", text: "2D drawings or PDFs with dimensions can be turned into accurate 3D models." },
            { title: "Product concepts", text: "Describe what the product should do and we'll discuss how to model and prototype it." },
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Process" title="How design projects work">
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            ["Brief", "You share references and explain how the part will be used."],
            ["Proposal", "We confirm scope, questions, design cost and timeline."],
            ["Model & review", "We create the model and share it for your feedback."],
            ["Print", "Once approved, we print and finish the part — or hand over the file."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-mono text-xs text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <section id="design-enquiry" className="section scroll-mt-20" aria-labelledby="design-form-heading">
        <div className="container-x max-w-4xl">
          <p className="eyebrow">Design enquiry</p>
          <h2 id="design-form-heading" className="h-section mt-3">Tell us about your design</h2>
          <p className="lead mt-4">Attach reference images, PDFs or existing 3D files. We&apos;ll review them and reply with questions or a proposal.</p>
          <div className="mt-10">
            <QuoteFormSection variant="design" />
          </div>
        </div>
      </section>
    </ServiceLayout>
  );
}
