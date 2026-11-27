"use client";

import { useRef, type ReactNode } from "react";

/** Subtle 3D tilt that follows the mouse (desktop only, disabled for reduced motion). */
export function Tilt({ children, className = "", max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const reset = () => {
    const el = ref.current!;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`tilt group/tilt relative ${className}`}>
      {children}
      <div className="tilt-glare pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100" aria-hidden="true" />
    </div>
  );
}
