"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { mainNav } from "@/config/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 text-white"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-ink-900 px-4 pb-10 pt-4">
          <nav aria-label="Mobile">
            <ul className="divide-y divide-ink-700">
              {mainNav.map((item) => (
                <li key={item.href} className="py-1">
                  <Link href={item.href} className="block py-3 text-lg font-semibold text-white">
                    {item.label}
                  </Link>
                  {"children" in item && (
                    <ul className="mb-2 grid gap-1 pl-3">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className="block py-2 text-ink-300 hover:text-white">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li className="py-1"><Link href="/faq" className="block py-3 text-lg font-semibold text-white">FAQ</Link></li>
            </ul>
          </nav>
          <Link
            href="/get-a-quote"
            data-track="cta_get_quote"
            data-track-location="mobile_menu"
            className="mt-6 flex h-13 items-center justify-center rounded-full bg-accent text-base font-semibold text-ink-950"
          >
            Get a Quote
          </Link>
        </div>
      )}
    </div>
  );
}
