"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import type { FormState } from "@/shop/server/admin/auth-actions";

type Action = (s: FormState, f: FormData) => Promise<FormState>;
type FieldDef = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };

/** Generic admin auth form (login, forgot, reset, setup) driven by a server action. */
export function AdminAuthForm({ action, fields, submit, hidden = {} }: { action: Action; fields: FieldDef[]; submit: string; hidden?: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.message) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{state.message}</p>;
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">{state.error}</p>}
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="field-label">{f.label}</span>
          <input name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required className="input" />
          {f.hint && <span className="field-hint block">{f.hint}</span>}
        </label>
      ))}
      <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-ink-950 hover:bg-accent-soft disabled:opacity-60">
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {submit}
      </button>
    </form>
  );
}
