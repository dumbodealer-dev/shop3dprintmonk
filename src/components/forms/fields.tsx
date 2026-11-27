"use client";

import { useId, type ReactNode } from "react";

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
};

function Wrapper({ label, id, error, hint, required, className = "", children }: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? <span className="text-danger" aria-hidden="true"> *</span> : <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
  min,
  max,
  ...base
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  min?: string | number;
  max?: string | number;
}) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <input
        id={id}
        name={base.name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        max={max}
        required={base.required}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.error, base.hint)}
        className="input"
      />
    </Wrapper>
  );
}

export function TextArea({ value, onChange, rows = 4, placeholder, ...base }: BaseProps & { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <textarea
        id={id}
        name={base.name}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={base.required}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.error, base.hint)}
        className="input resize-y"
      />
    </Wrapper>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ...base
}: BaseProps & { value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper {...base} id={id}>
      <select
        id={id}
        name={base.name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={base.required}
        aria-invalid={base.error ? true : undefined}
        aria-describedby={describedBy(id, base.error, base.hint)}
        className="input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%235c4f46%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%235c4f46%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Large tappable radio cards. */
export function ChoiceCards({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  required,
  cols = 3,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string; hint?: string }[];
  error?: string;
  required?: boolean;
  cols?: 2 | 3 | 4;
}) {
  const c = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <fieldset aria-invalid={error ? true : undefined}>
      <legend className="field-label">
        {legend}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </legend>
      <div className={`grid gap-2.5 ${c}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-3.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/25 ${value === o.value ? "border-accent-ink bg-accent/5" : "border-line hover:border-ink-300"}`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="mt-1 h-4 w-4 accent-[#b93f00]" />
            <span>
              <span className="block text-[0.95rem] font-semibold">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}

export function CheckboxGroup({
  legend,
  values,
  onChange,
  options,
  cols = 2,
}: {
  legend: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: readonly { value: string; label: string }[];
  cols?: 2 | 3;
}) {
  const c = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <fieldset>
      <legend className="field-label">
        {legend} <span className="ml-1 font-normal text-muted">(optional)</span>
      </legend>
      <div className={`grid gap-2 ${c}`}>
        {options.map((o) => {
          const checked = values.includes(o.value);
          return (
            <label key={o.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[0.95rem] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/25 ${checked ? "border-accent-ink bg-accent/5" : "border-line bg-white hover:border-ink-300"}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
                className="h-4 w-4 accent-[#b93f00]"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Checkbox({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer gap-3 text-[0.95rem] leading-relaxed">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={error ? true : undefined} className="mt-1 h-4 w-4 shrink-0 accent-[#b93f00]" />
        <span>{children}</span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/** Invisible to people, tempting to bots. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
