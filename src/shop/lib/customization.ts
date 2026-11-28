import type { CustomizationInput, CustomizationOption } from "./types";
import { round2 } from "./money";

/**
 * Validates a customer's customisation choices against the product's options and
 * returns the normalised input, the per-unit surcharge and readable labels.
 * Runs on the server for every cart change and again at checkout.
 */
export function resolveCustomization(
  options: CustomizationOption[],
  input: unknown,
): { ok: true; value: CustomizationInput; surcharge: number; labels: { label: string; value: string }[]; key: string } | { ok: false; error: string } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const value: CustomizationInput = {};
  const labels: { label: string; value: string }[] = [];
  let surcharge = 0;

  for (const opt of options) {
    const v = raw[opt.id];
    if (opt.type === "text") {
      const text = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim() : "";
      if (!text) {
        if (opt.required) return { ok: false, error: `Please fill in “${opt.label}”.` };
        continue;
      }
      if (text.length > opt.maxLength) return { ok: false, error: `“${opt.label}” can be at most ${opt.maxLength} characters.` };
      value[opt.id] = text;
      labels.push({ label: opt.label, value: text });
      surcharge += opt.priceDelta;
    } else if (opt.type === "select") {
      const choice = typeof v === "string" ? opt.choices.find((c) => c.label === v) : undefined;
      if (!choice) {
        if (opt.required) return { ok: false, error: `Please choose “${opt.label}”.` };
        continue;
      }
      value[opt.id] = choice.label;
      labels.push({ label: opt.label, value: choice.label });
      surcharge += choice.priceDelta;
    } else if (opt.type === "checkbox") {
      if (v === true || v === "true") {
        value[opt.id] = true;
        labels.push({ label: opt.label, value: "Yes" });
        surcharge += opt.priceDelta;
      }
    }
  }
  const key = Object.keys(value).length ? JSON.stringify(Object.keys(value).sort().map((k) => [k, value[k]])) : "";
  return { ok: true, value, surcharge: round2(surcharge), labels, key };
}

/** Parses the customization JSON stored on a product, dropping anything malformed. */
export function parseCustomizationOptions(raw: unknown): CustomizationOption[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomizationOption[] = [];
  for (const o of raw) {
    if (!o || typeof o !== "object" || typeof o.id !== "string" || typeof o.label !== "string") continue;
    if (o.type === "text") out.push({ id: o.id, label: o.label, type: "text", required: !!o.required, maxLength: Math.min(Number(o.maxLength) || 40, 500), placeholder: o.placeholder, priceDelta: Number(o.priceDelta) || 0, help: o.help });
    else if (o.type === "select" && Array.isArray(o.choices))
      out.push({ id: o.id, label: o.label, type: "select", required: !!o.required, help: o.help, choices: o.choices.filter((c: { label?: unknown }) => typeof c?.label === "string").map((c: { label: string; priceDelta?: unknown }) => ({ label: c.label, priceDelta: Number(c.priceDelta) || 0 })) });
    else if (o.type === "checkbox") out.push({ id: o.id, label: o.label, type: "checkbox", required: false, priceDelta: Number(o.priceDelta) || 0, help: o.help });
  }
  return out;
}
