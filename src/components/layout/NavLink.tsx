"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[0.92rem] font-medium transition xl:px-3.5 ${active ? "text-white" : "text-ink-300 hover:text-white"} ${active ? "bg-white/[0.06]" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
