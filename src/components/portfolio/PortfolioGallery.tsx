"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { PORTFOLIO_CATEGORIES, type PortfolioProject } from "@/content/types";

const TECH_LABEL = { fdm: "FDM", sla: "SLA", fdm_sla: "FDM + SLA" } as const;

export function PortfolioGallery({ projects, showFilters = true }: { projects: PortfolioProject[]; showFilters?: boolean }) {
  const [filter, setFilter] = useState<string>("All");
  const [active, setActive] = useState<{ project: PortfolioProject; index: number } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const available = useMemo(
    () => PORTFOLIO_CATEGORIES.filter((c) => projects.some((p) => p.categories.includes(c))),
    [projects],
  );
  const visible = filter === "All" ? projects : projects.filter((p) => p.categories.includes(filter as PortfolioProject["categories"][number]));

  const open = (project: PortfolioProject, index = 0) => {
    setActive({ project, index });
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = (d: number) =>
    setActive((a) => (a ? { ...a, index: (a.index + d + a.project.images.length) % a.project.images.length } : a));

  return (
    <div>
      {showFilters && available.length > 1 && (
        <div role="group" aria-label="Filter projects by category" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {["All", ...available].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${filter === c ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-text hover:border-ink-300"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <li key={p.slug} className="card group overflow-hidden">
            <button type="button" onClick={() => open(p)} className="relative block aspect-[4/3] w-full overflow-hidden bg-ink-900" aria-label={`View photos of ${p.title}`}>
              <Image src={p.images[0].src} alt={p.images[0].alt} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
              {p.images.length > 1 && (
                <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/80 px-2.5 py-1 font-mono text-xs text-white">{p.images.length} photos</span>
              )}
            </button>
            <div className="p-5">
              <h3 className="text-lg font-bold">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Spec label="Technology" value={TECH_LABEL[p.technology]} />
                <Spec label="Material" value={p.material} />
                <Spec label="Use" value={p.intendedUse} />
                <Spec label="Finishing" value={p.finishing} />
                <Spec label="Quantity" value={p.quantity} />
              </dl>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onClick={(e) => e.target === dialogRef.current && close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto w-[min(1100px,94vw)] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-ink-950/90"
        aria-label={active ? `${active.project.title} photos` : "Project photos"}
      >
        {active && (
          <div className="relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink-900 sm:aspect-[16/10]">
              <Image src={active.project.images[active.index].src} alt={active.project.images[active.index].alt} fill sizes="94vw" className="object-contain" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-white">
              <p className="text-sm"><strong>{active.project.title}</strong> <span className="text-ink-300">· {active.index + 1}/{active.project.images.length}</span></p>
              <div className="flex gap-2">
                {active.project.images.length > 1 && (
                  <>
                    <IconBtn label="Previous photo" onClick={() => step(-1)}><ChevronLeft className="h-5 w-5" /></IconBtn>
                    <IconBtn label="Next photo" onClick={() => step(1)}><ChevronRight className="h-5 w-5" /></IconBtn>
                  </>
                )}
                <IconBtn label="Close" onClick={close}><X className="h-5 w-5" /></IconBtn>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-600 bg-ink-900 hover:border-accent">
      {children}
    </button>
  );
}
