import { Camera } from "lucide-react";
import { PORTFOLIO_CATEGORIES } from "@/content/types";
import { ButtonLink } from "@/components/ui/Button";

/** Honest empty state: shown until real, approved project photos are published. */
export function PortfolioEmpty() {
  return (
    <div className="card tech-grid-light flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-accent">
        <Camera className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold">Project gallery coming soon</h2>
      <p className="mt-3 max-w-lg text-muted">
        Our project gallery is being prepared. Looking for examples similar to your project? Ask us when you send your enquiry.
      </p>
      <ul className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
        {PORTFOLIO_CATEGORIES.map((c) => (
          <li key={c} className="rounded-full border border-line bg-white px-3 py-1 text-sm text-muted">{c}</li>
        ))}
      </ul>
      <ButtonLink href="/get-a-quote" className="mt-8">Discuss your project</ButtonLink>
    </div>
  );
}
