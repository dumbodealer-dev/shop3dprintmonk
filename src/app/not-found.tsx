import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="dark-band tech-grid">
      <div className="container-x flex min-h-[65vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-mono text-sm tracking-[0.3em] text-accent">ERROR 404</p>
        <h1 className="h-display mt-4">This layer is missing.</h1>
        <p className="lead mt-5 max-w-lg">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">Back to home</ButtonLink>
          <ButtonLink href="/get-a-quote" variant="outline-dark" size="lg">Get a Quote</ButtonLink>
        </div>
        <p className="mt-10 text-sm text-ink-300">
          Popular: <Link href="/services" className="underline underline-offset-4 hover:text-white">Services</Link> ·{" "}
          <Link href="/materials" className="underline underline-offset-4 hover:text-white">Materials</Link> ·{" "}
          <Link href="/faq" className="underline underline-offset-4 hover:text-white">FAQ</Link>
        </p>
      </div>
    </section>
  );
}
