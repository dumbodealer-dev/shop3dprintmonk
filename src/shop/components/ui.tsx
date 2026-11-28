import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { discountPercent, formatINR } from "@/shop/lib/money";

/** Small presentational building blocks shared by storefront, account and admin. */

export function Price({ price, sale, size = "md", from = false }: { price: number; sale?: number | null; size?: "sm" | "md" | "lg"; from?: boolean }) {
  const pct = discountPercent(price, sale);
  const main = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {from && <span className="text-xs font-medium text-muted">From</span>}
      <span className={`${main} font-extrabold tracking-tight text-text`}>{formatINR(pct ? sale! : price)}</span>
      {pct && (
        <>
          <span className="text-sm text-muted line-through" aria-label={`Was ${formatINR(price)}`}>{formatINR(price)}</span>
          <span className="text-sm font-bold text-success">{pct}% off</span>
        </>
      )}
    </span>
  );
}

export function Stars({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  const px = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ""}`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`${px} ${i <= Math.round(value) ? "fill-accent text-accent" : "fill-transparent text-ink-300"}`} />
        ))}
      </span>
      {count != null && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}

const TONES = {
  accent: "bg-accent text-ink-950",
  dark: "bg-ink-900 text-white",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-amber-100 text-amber-900",
  info: "bg-sky-100 text-sky-900",
  neutral: "bg-paper-2 text-muted",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${TONES[tone]} ${className}`}>{children}</span>;
}

/** Shown wherever a product has no photo yet: on-brand technical illustration, never a stock image. */
export function ProductPlaceholder({ name, className = "" }: { name: string; className?: string }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const variant = h % 3;
  return (
    <div className={`tech-grid relative flex items-center justify-center overflow-hidden bg-ink-900 ${className}`} role="img" aria-label={`${name} — photo coming soon`}>
      <svg viewBox="0 0 120 120" className="h-1/2 w-1/2 opacity-90" aria-hidden="true">
        {variant === 0 && (
          <g fill="none" stroke="#ff6a13" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M60 14 98 36v48L60 106 22 84V36Z" fill="rgb(255 106 19 / .08)" />
            <path d="M22 36 60 58l38-22M60 58v48" />
          </g>
        )}
        {variant === 1 && (
          <g fill="none" stroke="#ff6a13" strokeWidth="1.6">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <ellipse key={i} cx="60" cy={92 - i * 10} rx={34 - i * 3} ry="8" fill={`rgb(255 106 19 / ${0.03 + i * 0.015})`} />
            ))}
          </g>
        )}
        {variant === 2 && (
          <g fill="none" stroke="#ff6a13" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M60 16 100 96H20Z" fill="rgb(255 106 19 / .08)" />
            <path d="M60 16 72 96M60 16 44 96M30 76h60M38 60h44" opacity=".6" />
          </g>
        )}
      </svg>
      <span className="absolute bottom-3 left-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-400">3D PRINTMONK</span>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-2 text-accent-ink">{icon}</div>}
      <h2 className="text-xl font-bold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  const c = { info: "bg-sky-50 text-sky-950 border-sky-200", success: "bg-emerald-50 text-emerald-950 border-emerald-200", warning: "bg-amber-50 text-amber-950 border-amber-200", danger: "bg-red-50 text-red-900 border-red-200" }[tone];
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-paper-2 ${className}`} aria-hidden="true" />;
}
