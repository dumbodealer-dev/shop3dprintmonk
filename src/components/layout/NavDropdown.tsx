"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Item = { href: string; label: string; summary: string };

/**
 * Hover/keyboard dropdown that closes reliably: on mouse leave (short grace
 * delay), Escape, focus leaving the menu, clicking a link, or navigating.
 */
export function NavDropdown({ label, href, items }: { label: string; href: string; items: readonly Item[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLLIElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    cancel();
    setOpen(true);
  };
  const hide = (delay = 120) => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), delay);
  };

  useEffect(() => cancel, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <li
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onBlur={(e) => !rootRef.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <div className="flex items-center">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`whitespace-nowrap rounded-l-full py-2 pl-2.5 pr-1 text-[0.92rem] font-medium transition xl:pl-3.5 ${active ? "text-white" : "text-ink-300 hover:text-white"}`}
          onClick={() => setOpen(false)}
        >
          {label}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`${open ? "Hide" : "Show"} ${label} menu`}
          onClick={() => (open ? setOpen(false) : show())}
          className="rounded-r-full py-2 pl-0.5 pr-2.5 text-ink-300 hover:text-white xl:pr-3"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180 text-accent" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div
        id={menuId}
        hidden={!open}
        className="absolute left-1/2 top-full w-[34rem] -translate-x-1/2 pt-3"
      >
        <ul className="grid grid-cols-2 gap-1 rounded-2xl border border-ink-700 bg-ink-850 p-2 shadow-2xl shadow-black/50">
          {items.map((c) => (
            <li key={c.href}>
              <Link href={c.href} onClick={() => setOpen(false)} className="block rounded-xl p-3 transition hover:bg-ink-800 focus-visible:bg-ink-800">
                <span className="block text-sm font-semibold text-white">{c.label}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-300">{c.summary}</span>
              </Link>
            </li>
          ))}
          <li className="col-span-2 border-t border-ink-700 pt-1">
            <Link href={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-accent hover:bg-ink-800">
              All services →
            </Link>
          </li>
        </ul>
      </div>
    </li>
  );
}
