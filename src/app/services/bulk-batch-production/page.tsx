import { business } from "@/config/business";
import { serviceBySlug } from "@/content/services";
import { pageMetadata } from "@/lib/seo";
import { CheckList, InfoGrid, Section, ServiceLayout } from "@/components/services/ServiceLayout";

const service = serviceBySlug("bulk-batch-production")!;
export const metadata = pageMetadata({ title: service.seoTitle, description: service.seoDescription, path: `/services/${service.slug}` });

export default function BulkPage() {
  const p = business.policies;
  return (
    <ServiceLayout
      service={service}
      quoteHref="/get-a-quote?type=bulk"
      title="Bulk 3D printing and batch production for businesses"
      lead="Move from an approved prototype to repeatable production runs — with quantity-based quotations, batch finishing, inspection and confidential handling of your designs."
    >
      <Section eyebrow="Workflow" title="Prototype-to-production workflow" lead="A clear path from first sample to repeat orders, so every batch matches what you approved.">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["Requirements", "Share files, quantities, target material, finish and timelines."],
            ["Sample / pilot", "We print a sample or small pilot so you can check form, fit and finish."],
            ["Approval", "You approve the sample, material, settings and price per quantity."],
            ["Production", "Parts are printed in batches, finished and inspected against the approved sample."],
            ["Repeat orders", "Reorder by quoting your reference — we match the approved specification."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-mono text-xs text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="white" eyebrow="Capabilities" title="Built for business orders">
        <InfoGrid
          items={[
            { title: "Quantity-based quotations", text: "Tell us the quantities you're considering (for example 50, 200 and 500 pieces) and we'll quote each so you can plan." },
            { title: "Repeat production", text: "Approved parts can be reordered as needed — quote your previous enquiry reference to match the specification." },
            { title: "Multiple-part orders", text: "Send complete assemblies or a list of different parts in one enquiry; upload all files together." },
            { title: "Batch finishing", text: "Support removal, sanding, priming, painting and assembly applied consistently across a batch." },
            { title: "Quality inspection", text: "Parts are visually checked and compared against the approved sample before dispatch. Tell us which dimensions are critical." },
            { title: "Project timelines", text: "Share your deadline and delivery schedule — we'll confirm a realistic production plan with the quotation, including staged deliveries if needed." },
          ]}
        />
      </Section>

      <Section eyebrow="Commercial" title="Purchase orders, GST invoices and confidentiality">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-lg font-bold">Purchase orders &amp; invoicing</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
              {p.gstInvoice === true
                ? `GST invoices are provided${p.gstin ? ` (GSTIN ${p.gstin})` : ""}. `
                : "Need a GST invoice? Add your company name and GSTIN in the enquiry and we'll confirm invoicing details with the quotation. "}
              {p.acceptsPurchaseOrders === true
                ? "We accept purchase orders from businesses and institutions."
                : "If your organisation works with purchase orders, mention it in your enquiry so we can align the paperwork."}
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-bold">Confidentiality &amp; intellectual property</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
              Your files are uploaded to private storage and are only accessed by our team to review and produce your project. Your designs remain
              your property and are never published or shared without your permission.{" "}
              {p.signsNda === true ? "We can sign an NDA before you share detailed files." : "If you require an NDA, mention it in your enquiry and we'll discuss it before you share detailed files."}
            </p>
          </div>
        </div>
      </Section>

      <Section tone="white" eyebrow="Getting an accurate quote" title="What to include in a bulk enquiry">
        <CheckList
          items={[
            "3D files for every part (STEP preferred for engineering parts)",
            "Quantities — or a few quantity tiers to compare",
            "Material or performance requirements (heat, strength, flexibility)",
            "Finish and colour requirements",
            "Critical dimensions or tolerances",
            "Delivery deadline, schedule and delivery city",
          ]}
        />
      </Section>
    </ServiceLayout>
  );
}
