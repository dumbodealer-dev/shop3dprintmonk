/**
 * Privacy-safe analytics helper (client side).
 * - Nothing is sent until the visitor accepts analytics cookies.
 * - Only whitelisted, non-personal parameters are forwarded — never names,
 *   emails, phone numbers, file names or file contents.
 */
export type AnalyticsEvent =
  | "quote_submit"
  | "quote_step"
  | "file_upload_complete"
  | "design_enquiry_submit"
  | "contact_submit"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "cta_get_quote"
  | "service_engagement";

const ALLOWED_PARAMS = new Set(["location", "context", "step", "technology", "enquiry_type", "file_count", "page_path", "service"]);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const CONSENT_KEY = "pm-analytics-consent";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined" || !window.gtag || !hasConsent()) return;
  const safe: Record<string, string | number> = { page_path: window.location.pathname };
  for (const [k, v] of Object.entries(params)) if (ALLOWED_PARAMS.has(k) && v !== undefined) safe[k] = v;
  window.gtag("event", event, safe);
}
