"use client";

import { useId } from "react";
import { STATE_NAMES } from "@/shop/lib/india";

export type AddressValue = { fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
export const emptyAddress = (): AddressValue => ({ fullName: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" });

/** Indian address form: 10-digit mobile, 6-digit PIN, state list (GST place of supply). */
export function AddressFields({ value, onChange, errors = {}, prefix }: { value: AddressValue; onChange: (v: AddressValue) => void; errors?: Record<string, string>; prefix: string }) {
  const id = useId();
  const set = (k: keyof AddressValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const err = (k: string) => errors[`${prefix}.${k}`];
  const field = (k: keyof AddressValue, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, optional = false, className = "") => (
    <div className={className}>
      <label htmlFor={`${id}-${k}`} className="field-label">{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</label>
      <input id={`${id}-${k}`} className="input" value={value[k]} onChange={set(k)} aria-invalid={!!err(k)} aria-describedby={err(k) ? `${id}-${k}-e` : undefined} {...props} />
      {err(k) && <p id={`${id}-${k}-e`} className="field-error" role="alert">{err(k)}</p>}
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field("fullName", "Full name", { autoComplete: "name", required: true, maxLength: 120 })}
      {field("phone", "Mobile number", { autoComplete: "tel", inputMode: "tel", required: true, placeholder: "10-digit mobile", maxLength: 16 })}
      {field("line1", "Flat / house no., building, street", { autoComplete: "address-line1", required: true, maxLength: 200 }, false, "sm:col-span-2")}
      {field("line2", "Area, locality", { autoComplete: "address-line2", maxLength: 200 }, true, "sm:col-span-2")}
      {field("landmark", "Landmark", { maxLength: 120 }, true)}
      {field("pincode", "PIN code", { autoComplete: "postal-code", inputMode: "numeric", required: true, maxLength: 6, pattern: "[1-9][0-9]{5}" })}
      {field("city", "City / town", { autoComplete: "address-level2", required: true, maxLength: 80 })}
      <div>
        <label htmlFor={`${id}-state`} className="field-label">State / UT</label>
        <select id={`${id}-state`} className="input" value={value.state} onChange={set("state")} required autoComplete="address-level1" aria-invalid={!!err("state")}>
          <option value="">Select state</option>
          {STATE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {err("state") && <p className="field-error" role="alert">{err("state")}</p>}
      </div>
    </div>
  );
}
