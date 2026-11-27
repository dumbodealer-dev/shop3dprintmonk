import Image from "next/image";
import { business } from "@/config/business";

/**
 * Brand lockup: the monk mark from the official logo + wordmark.
 * The full logo (with its dark wordmark) is used on light backgrounds via <LogoFull />.
 */
export function Logo({ tone = "light", className = "", priority = false }: { tone?: "light" | "dark"; className?: string; priority?: boolean }) {
  const text = tone === "light" ? "text-white" : "text-text";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {business.logo ? (
        <Image src="/brand/logo-mark-240.webp" alt="" width={240} height={198} priority={priority} className="h-10 w-auto shrink-0 drop-shadow-[0_2px_8px_rgba(255,106,19,0.25)]" />
      ) : (
        <LogoMark className="h-8 w-8 shrink-0" />
      )}
      <span className={`font-sans text-[1.05rem] font-extrabold leading-none tracking-[0.06em] ${text}`}>
        3D PRINT<span className="text-accent">MONK</span>
      </span>
    </span>
  );
}

export function LogoFull({ className = "" }: { className?: string }) {
  return <Image src={business.logoFull} alt={`${business.name} logo`} width={1096} height={1227} className={className} />;
}

/** Geometric fallback mark (used only if the logo file is removed). */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 2.5 28 9.25v13.5L16 29.5 4 22.75V9.25L16 2.5Z" fill="#1f1712" stroke="#ff6a13" strokeWidth="1.6" />
      <path d="M9 13.2 16 17l7-3.8M9 17.2 16 21l7-3.8M9 21.2 16 25l7-3.8" fill="none" stroke="#ff6a13" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9.6 16 6l7 3.6-7 3.8-7-3.8Z" fill="#ff6a13" />
    </svg>
  );
}
