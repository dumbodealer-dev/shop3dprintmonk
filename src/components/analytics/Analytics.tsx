"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_KEY, track, type AnalyticsEvent } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/**
 * Google Analytics 4, loaded only after consent, plus delegated click tracking
 * for WhatsApp / phone / email links and elements with data-track="event".
 */
export function Analytics() {
  const [consent, setConsent] = useState<"granted" | "denied" | null | "unknown">("unknown");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
    setConsent(stored === "granted" || stored === "denied" ? stored : null);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a, button, [data-track]");
      if (!el) return;
      const href = el.getAttribute("href") ?? "";
      if (href.includes("wa.me/")) return track("whatsapp_click", { context: el.dataset.waContext ?? "link" });
      if (href.startsWith("tel:")) return track("phone_click", { location: el.dataset.trackLocation });
      if (href.startsWith("mailto:")) return track("email_click", { location: el.dataset.trackLocation });
      const name = el.dataset.track as AnalyticsEvent | undefined;
      if (name) track(name, { location: el.dataset.trackLocation, service: el.dataset.trackService });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!GA_ID) return null;

  const choose = (value: "granted" | "denied") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {}
    setConsent(value);
  };

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === null && (
        <div role="dialog" aria-live="polite" aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 text-sm shadow-2xl sm:bottom-6 sm:p-5">
          <p className="text-muted">
            We use optional analytics cookies to understand which pages help visitors. No personal details or uploaded files are shared.{" "}
            <Link href="/privacy-policy" className="font-semibold text-accent-ink underline underline-offset-2">Privacy Policy</Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => choose("granted")} className="h-9 rounded-full bg-ink-900 px-4 font-semibold text-white hover:bg-ink-700">Accept</button>
            <button type="button" onClick={() => choose("denied")} className="h-9 rounded-full border border-line px-4 font-semibold text-text hover:bg-paper">Decline</button>
          </div>
        </div>
      )}
    </>
  );
}
