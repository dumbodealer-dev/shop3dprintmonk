"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import {
  CUSTOMER_TYPES,
  DESIGN_INPUTS,
  FINISHING_OPTIONS,
  TECHNOLOGIES,
  customerSchema,
  fieldErrors,
  labelFor,
  projectSchema,
} from "@/lib/validation";
import { estimate as computeEstimate, type RateOverride } from "@/lib/pricing/estimate";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup, ChoiceCards, Checkbox, Honeypot, SelectField, TextArea, TextField } from "./fields";
import { FileUploader, type UploadItem, type UploadLimits } from "./FileUploader";
import { EstimatePanel } from "./EstimatePanel";

export type QuoteVariant = "quote" | "bulk" | "design";
export type MaterialOption = RateOverride & { value: string; label: string };

type Props = {
  variant: QuoteVariant;
  limits: UploadLimits;
  configured: boolean;
  materials: MaterialOption[];
  initialTechnology?: string;
  initialFinishing?: string[];
  initialNeedsDesign?: boolean;
};

const STEPS = {
  quote: ["Upload & estimate", "Project details", "Your details", "Review"],
  bulk: ["Upload files", "Project details", "Your details", "Review"],
  design: ["References", "Design brief", "Your details", "Review"],
};

export function QuoteForm({ variant, limits, configured, materials, initialTechnology = "", initialFinishing = [], initialNeedsDesign = false }: Props) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadSession] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => Date.now());
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const [customer, setCustomer] = useState({ fullName: "", company: "", email: "", phone: "", city: "", customerType: variant === "bulk" ? "business" : "" });
  const [project, setProject] = useState({
    title: "",
    technology: variant === "design" ? "not_sure" : initialTechnology,
    material: "",
    quantity: variant === "bulk" ? "" : "1",
    dimensions: "",
    deliveryDate: "",
    application: "",
    finishing: initialFinishing,
    notes: "",
  });
  const [designInputs, setDesignInputs] = useState<string[]>([]);
  const [needsDesign, setNeedsDesign] = useState(variant === "design" || initialNeedsDesign);
  const [permission, setPermission] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const steps = STEPS[variant];
  const uploading = files.some((f) => f.status === "uploading" || f.status === "queued");
  const failed = files.filter((f) => f.status === "error");
  const sendable = files.filter((f) => f.status === "done");

  const materialOptions = materials.filter(
    (m) => !project.technology || project.technology === "not_sure" || m.technology === project.technology,
  );
  const selectedMaterial = materials.find((m) => m.value === project.material);

  const est = useMemo(
    () =>
      computeEstimate({
        parts: files.filter((f) => f.model.state === "ready" || f.model.state === "error").map((f) => ({ id: f.id, name: f.name, analysis: f.model.state === "ready" ? f.model.analysis : null })),
        unanalysedFiles: files.filter((f) => f.model.state === "none").length,
        technology: project.technology,
        materialSlug: selectedMaterial?.slug,
        quantity: Math.max(1, Number(project.quantity) || 1),
        finishing: project.finishing,
        enquiryType: variant,
        needsDesign,
        materials,
      }),
    [files, project.technology, selectedMaterial?.slug, project.quantity, project.finishing, variant, needsDesign, materials],
  );
  const analysing = files.some((f) => f.model.state === "loading");

  // Pre-fill dimensions from the first measured model.
  const firstSize = files.find((f) => f.model.state === "ready");
  useEffect(() => {
    if (firstSize?.model.state === "ready" && !project.dimensions) {
      const s = firstSize.model.analysis.size.map((n) => Math.round(n)).join(" × ");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived default the customer can still edit
      setProject((p) => (p.dimensions ? p : { ...p, dimensions: `${s} mm (from ${firstSize.name})` }));
    }
  }, [firstSize, project.dimensions]);

  useEffect(() => {
    if (step > 0) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const setC = (k: keyof typeof customer) => (v: string) => setCustomer((c) => ({ ...c, [k]: v }));
  const setP = (k: keyof typeof project) => (v: string) => setProject((p) => ({ ...p, [k]: v }));

  function validateStep(i: number): boolean {
    let errs: Record<string, string> = {};
    if (i === 0) {
      if (uploading) errs.files = "Please wait for uploads to finish";
      else if (failed.length) errs.files = "Some files failed to upload — retry or remove them";
      if (files.length > 0 && !permission) errs.permission = "Please confirm you have permission to share these files";
      if (!project.technology) errs.technology = "Please choose a technology (or Not sure)";
      const q = Number(project.quantity);
      if (!Number.isInteger(q) || q < 1) errs.quantity = "Enter a quantity of at least 1";
    }
    if (i === 1) {
      const r = projectSchema.safeParse(project);
      if (!r.success) errs = fieldErrors(r.error);
      const n = project.notes.trim().length;
      if (variant === "design" && n < 20) errs.notes = "Please describe what you need designed (a few sentences)";
      else if (files.length === 0 && !needsDesign && n < 20) errs.notes = "Without a file, please describe your project in a few sentences";
    }
    if (i === 2) {
      const r = customerSchema.safeParse(customer);
      if (!r.success) errs = fieldErrors(r.error);
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.focus?.());
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    track("quote_step", { step: step + 2, enquiry_type: variant });
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < steps.length - 1) return next();
    for (let i = 0; i < 3; i++) if (!validateStep(i)) return setStep(i);
    if (!privacy) return setErrors({ privacy: "Please accept the privacy notice to continue" });

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiryType: variant,
          customer,
          project: { ...project, quantity: Number(project.quantity), material: selectedMaterial?.label ?? (project.material === "advise" ? "Not sure — please advise" : "") },
          designInputs,
          needsDesign,
          files: sendable.map((f) => ({ path: f.path, name: f.name, size: f.size })),
          uploadSession,
          permissionConfirmed: permission,
          privacyAccepted: privacy,
          estimate: {
            mode: est.mode,
            low: est.mode === "instant" ? est.low : null,
            high: est.mode === "instant" ? est.high : null,
            material: est.materialName,
            technology: est.technology,
            reasons: est.reasons.slice(0, 10),
            lines: est.lines.slice(0, 50).map((l) => ({ name: l.name, grams: l.grams, supportGrams: l.supportGrams, sizeMm: l.sizeMm, unitPrice: l.unitPrice, quantity: l.quantity, subtotal: l.subtotal })),
          },
          website: honeypot,
          startedAt,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string; fields?: Record<string, string> };
      if (!res.ok || !data.reference) {
        if (data.fields) setErrors(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k.replace(/^(customer|project)\./, ""), v])));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      track(variant === "design" ? "design_enquiry_submit" : "quote_submit", { enquiry_type: variant, technology: project.technology, file_count: sendable.length });
      router.push(`/get-a-quote/thank-you?ref=${encodeURIComponent(data.reference)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const err = (k: string) => errors[k];
  const showEstimate = variant !== "design";
  const estimateBlock = analysing ? (
    <div className="dark-band flex items-center gap-3 rounded-[var(--radius-card)] p-6 text-sm text-ink-200">
      <LoaderCircle className="h-5 w-5 animate-spin text-accent" aria-hidden="true" /> Measuring your model…
    </div>
  ) : (
    <EstimatePanel estimate={est} selectedId={selectedFileId ?? files[0]?.id ?? null} onSelect={setSelectedFileId} />
  );

  return (
    <div ref={topRef} className="min-w-0 scroll-mt-24">
      {!configured && (
        <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Online enquiries are being set up.</strong> You can preview files and see estimates, but requests can&apos;t be submitted until the
            database and file storage are configured (README → Supabase). Meanwhile, please <Link href="/contact" className="font-semibold underline">contact us directly</Link>.
          </p>
        </div>
      )}

      {/* Progress */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Form progress">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className={`h-full rounded-full bg-gradient-to-r from-accent-soft to-accent transition-all duration-500 ${i <= step ? "w-full" : "w-0"}`} />
            </div>
            <p className={`mt-2 flex items-center gap-1 text-xs font-semibold sm:text-sm ${i === step ? "text-text" : "text-muted"}`}>
              {i < step ? <Check className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" /> : <span className="font-mono">{i + 1}.</span>}
              <span className={i === step ? "" : "hidden sm:inline"}>{label}</span>
            </p>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} noValidate className="relative">
        <Honeypot value={honeypot} onChange={setHoneypot} />

        {/* Step 1 — files, process, live estimate */}
        {step === 0 && (
          <div className={`grid gap-6 ${showEstimate ? "lg:grid-cols-[1fr_340px]" : ""}`}>
            <div className="card min-w-0 space-y-6 p-4 sm:p-7">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">{variant === "design" ? "Share your references" : "Upload your 3D files"}</h2>
                <p className="mt-1 text-[0.95rem] text-muted">
                  {variant === "design"
                    ? "Photos, sketches, drawings (PDF) or existing 3D files. You can also continue without files."
                    : "STL, OBJ and 3MF files are shown in 3D and measured instantly. No 3D file? Continue and describe your idea."}
                </p>
              </div>
              <FileUploader
                uploadSession={uploadSession}
                items={files}
                setItems={setFiles}
                limits={limits}
                allowReferences={needsDesign}
                uploadEnabled={configured}
                selectedId={selectedFileId}
                onSelect={setSelectedFileId}
                afterPreview={showEstimate ? <div className="mb-4 lg:hidden">{estimateBlock}</div> : null}
              />
              {err("files") && <p className="field-error" role="alert">{err("files")}</p>}
              {variant !== "design" && (
                <Checkbox checked={needsDesign} onChange={setNeedsDesign}>
                  <strong>I need help creating the design.</strong> <span className="text-muted">Also lets you upload reference images and PDFs.</span>
                </Checkbox>
              )}
              {variant === "design" && <CheckboxGroup legend="What can you share?" options={DESIGN_INPUTS} values={designInputs} onChange={setDesignInputs} cols={3} />}
              {files.length > 0 && (
                <Checkbox checked={permission} onChange={setPermission} error={err("permission")}>
                  I confirm I own these files or have permission to share them for this enquiry.
                </Checkbox>
              )}

              <div className="border-t border-line pt-6">
                <ChoiceCards legend="Printing technology" name="technology" required options={TECHNOLOGIES} value={project.technology} onChange={(v) => setProject((p) => ({ ...p, technology: v, material: "" }))} error={err("technology")} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Material" name="material" options={[...materialOptions, { value: "advise", label: "Not sure — please advise" }]} placeholder="No preference" value={project.material} onChange={setP("material")} hint="Not sure? We'll recommend one." />
                <TextField label="Quantity (each part)" name="quantity" type="number" inputMode="numeric" min={1} required value={project.quantity} onChange={setP("quantity")} error={err("quantity")} hint={variant === "bulk" ? "Comparing quantities? Add tiers in the notes." : "5+ and 10+ pieces get a discount."} />
              </div>
              <CheckboxGroup legend="Finishing" options={FINISHING_OPTIONS} values={project.finishing} onChange={(v) => setProject((p) => ({ ...p, finishing: v }))} />
              <p className="flex gap-2 rounded-xl bg-paper px-4 py-3 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                Files are stored privately and only accessed by our team to review your enquiry. They are never published.
              </p>
            </div>

            {showEstimate && (
              <aside className={`min-w-0 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:rounded-[var(--radius-card)] ${files.length ? "hidden" : ""}`} aria-label="Price estimate">
                {estimateBlock}
              </aside>
            )}
          </div>
        )}

        {/* Step 2 — project details */}
        {step === 1 && (
          <div className="card grid gap-6 p-5 sm:p-8">
            <h2 className="text-xl font-bold sm:text-2xl">{steps[1]}</h2>
            <TextField
              label={variant === "design" ? "What should we design?" : "Project title"}
              name="title"
              required
              placeholder={variant === "design" ? "e.g. Replacement knob for a mixer" : "e.g. Enclosure for sensor board"}
              value={project.title}
              onChange={setP("title")}
              error={err("title")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Approximate dimensions" name="dimensions" placeholder="e.g. 120 × 80 × 40 mm" value={project.dimensions} onChange={setP("dimensions")} error={err("dimensions")} />
              <TextField label="Required delivery date" name="deliveryDate" type="date" min={new Date().toISOString().slice(0, 10)} value={project.deliveryDate} onChange={setP("deliveryDate")} error={err("deliveryDate")} />
            </div>
            <TextField label="Intended application" name="application" placeholder="What will the part be used for? Indoors/outdoors, load, heat…" value={project.application} onChange={setP("application")} error={err("application")} />
            <TextArea
              label={variant === "design" ? "Describe your design" : "Additional project notes"}
              name="notes"
              required={variant === "design" || (files.length === 0 && !needsDesign)}
              rows={5}
              placeholder={
                variant === "design"
                  ? "Key dimensions, how it fits or attaches, what it must do, look and feel…"
                  : "Colours, critical dimensions, tolerances, delivery city/country, GST invoice… Very large file? Paste a Google Drive / WeTransfer link here."
              }
              value={project.notes}
              onChange={setP("notes")}
              error={err("notes")}
            />
          </div>
        )}

        {/* Step 3 — contact details */}
        {step === 2 && (
          <div className="card p-5 sm:p-8">
            <h2 className="text-xl font-bold sm:text-2xl">Your details</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <TextField label="Full name" name="fullName" required autoComplete="name" value={customer.fullName} onChange={setC("fullName")} error={err("fullName")} />
              <TextField label="Company name" name="company" autoComplete="organization" value={customer.company} onChange={setC("company")} error={err("company")} />
              <TextField label="Email address" name="email" type="email" inputMode="email" required autoComplete="email" value={customer.email} onChange={setC("email")} error={err("email")} />
              <TextField label="Phone number" name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="+91" value={customer.phone} onChange={setC("phone")} error={err("phone")} hint="We may call or WhatsApp to clarify details." />
              <TextField label="City / country" name="city" required autoComplete="address-level2" value={customer.city} onChange={setC("city")} error={err("city")} />
              <SelectField label="I am a…" name="customerType" required options={CUSTOMER_TYPES} value={customer.customerType} onChange={setC("customerType")} error={err("customerType")} />
            </div>
          </div>
        )}

        {/* Step 4 — review */}
        {step === 3 && (
          <div className={`grid gap-6 ${showEstimate ? "lg:grid-cols-[1fr_340px]" : ""}`}>
            <div className="card grid min-w-0 gap-6 p-5 sm:p-8">
              <h2 className="text-xl font-bold sm:text-2xl">Review &amp; submit</h2>
              <dl className="grid gap-x-6 gap-y-4 rounded-2xl bg-paper p-5 text-sm sm:grid-cols-2">
                <Review label="Name" value={customer.fullName} />
                <Review label="Email" value={customer.email} />
                <Review label="Phone" value={customer.phone} />
                <Review label="City / country" value={customer.city} />
                <Review label="Project" value={project.title} />
                <Review label="Technology" value={labelFor(TECHNOLOGIES, project.technology)} />
                <Review label="Material" value={selectedMaterial?.label ?? (project.material === "advise" ? "Please advise" : "No preference")} />
                <Review label="Quantity" value={project.quantity} />
                <Review label="Dimensions" value={project.dimensions} />
                <Review label="Needed by" value={project.deliveryDate} />
                <Review label="Finishing" value={project.finishing.map((f) => labelFor(FINISHING_OPTIONS, f)).join(", ")} />
                <Review label="Files" value={files.length ? files.map((f) => f.name).join(", ") : needsDesign ? "None — design help requested" : "None"} />
              </dl>
              <Checkbox checked={privacy} onChange={setPrivacy} error={err("privacy")}>
                I agree that 3D PRINTMONK may store and use these details and files to respond to my enquiry, as described in the{" "}
                <Link href="/privacy-policy" target="_blank" className="font-semibold text-accent-ink underline underline-offset-2">Privacy Policy</Link>.
              </Checkbox>
              {submitError && (
                <p role="alert" className="flex gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {submitError}
                </p>
              )}
            </div>
            {showEstimate && (
              <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label="Price estimate summary">
                <EstimatePanel estimate={est} compact />
              </aside>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={() => { setErrors({}); setStep((s) => s - 1); }} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span className="text-xs text-muted"><span className="text-danger">*</span> Required</span>
          )}
          {step < steps.length - 1 ? (
            <Button type="submit" size="lg">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={submitting || !configured}>
              {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : variant === "design" ? "Send design enquiry" : est.mode === "instant" ? "Request confirmed quote" : "Submit quote request"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Review({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value || "—"}</dd>
    </div>
  );
}
