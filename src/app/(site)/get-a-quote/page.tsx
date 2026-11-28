import { Clock, FileCheck2, Lock, MessageCircle } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";
import { QuoteFormSection } from "@/components/forms/QuoteFormSection";

export const metadata = pageMetadata({
  title: "Get a 3D Printing Quote — Upload STL, STEP or OBJ",
  description:
    "Request a custom 3D printing quotation from 3D PRINTMONK. Upload STL, OBJ, 3MF or STEP files — or describe your idea. FDM, SLA, bulk orders, design and finishing.",
  path: "/get-a-quote",
});

const SERVICE_PRESETS: Record<string, { technology?: string; finishing?: string[]; needsDesign?: boolean }> = {
  "fdm-3d-printing": { technology: "fdm" },
  "sla-resin-3d-printing": { technology: "sla" },
  "post-processing-finishing": { finishing: ["advise"] },
  "custom-3d-design": { needsDesign: true },
};

export default async function QuotePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const service = typeof sp.service === "string" ? sp.service : "";
  const variant = sp.type === "bulk" || service === "bulk-batch-production" ? "bulk" : "quote";
  const preset = SERVICE_PRESETS[service] ?? {};

  return (
    <>
      <PageHero
        eyebrow={variant === "bulk" ? "Bulk & batch enquiry" : "Get a quote"}
        title={variant === "bulk" ? "Request a bulk production quote" : "Upload, preview in 3D, get an instant estimate"}
        lead="Drop your STL, OBJ or 3MF file to see it in 3D with a live price estimate — or describe your idea and we'll quote it manually."
        crumbs={[{ href: "/get-a-quote", label: "Get a Quote" }]}
      />
      <section className="section pt-10 sm:pt-12">
        <div className="container-x grid min-w-0 gap-10 [&>*]:min-w-0">
          <QuoteFormSection
            variant={variant}
            initialTechnology={preset.technology}
            initialFinishing={preset.finishing}
            initialNeedsDesign={preset.needsDesign}
          />
          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="About your quote">
            <Info icon={FileCheck2} title="Accepted files">STL, OBJ, 3MF, STEP and STP — heavy files welcome. Reference images and PDFs when you need design help.</Info>
            <Info icon={Clock} title="Instant or manual pricing">Simple parts get an instant preliminary estimate. Complex, painted or bulk orders get a detailed manual quote. Nothing is printed until you approve.</Info>
            <Info icon={Lock} title="Private & confidential">Files are stored privately and used only to review your project.</Info>
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4 text-accent-ink" /> Prefer to chat?</p>
              <p className="mt-2 text-sm text-muted">You can also send your files and questions on WhatsApp.</p>
              <WhatsAppLink context={variant === "bulk" ? "bulk" : "general"} variant="outline-light" size="sm" className="mt-4" />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Info({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-accent-ink" aria-hidden="true" /> {title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
