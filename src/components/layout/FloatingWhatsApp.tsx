"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";

/** Floating click-to-chat. Hidden on the quote form so it never covers form controls. */
export function FloatingWhatsApp({ href }: { href: string | null }) {
  const pathname = usePathname();
  if (!href || pathname.startsWith("/get-a-quote")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-wa-context="floating"
      aria-label="Chat with 3D PRINTMONK on WhatsApp"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-13 w-13 items-center justify-center rounded-full bg-[#1fae5b] text-white shadow-lg shadow-black/25 transition hover:scale-105 hover:bg-[#178a48] sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
