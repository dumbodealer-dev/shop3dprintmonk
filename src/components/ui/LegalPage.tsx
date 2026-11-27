import type { ReactNode } from "react";
import { PageHero } from "./PageHero";

export function LegalPage({ title, path, updated, children }: { title: string; path: string; updated: string; children: ReactNode }) {
  return (
    <>
      <PageHero title={title} crumbs={[{ href: path, label: title }]} lead={`Last updated: ${updated}`} />
      <section className="section">
        <div className="container-x max-w-3xl">
          <div className="prose-body">{children}</div>
        </div>
      </section>
    </>
  );
}
