"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { shopHref } from "@/shop/config";
import { api, ApiError } from "../api";
import { useShop } from "../ShopProvider";
import { Notice } from "../ui";

/** Only allow same-site relative redirects after sign-in (prevents open redirects). */
export const safeNext = (n: string | null | undefined) => (n && /^\/(?!\/)[\w\-./?=&#%]*$/.test(n) ? shopHref(n) : shopHref("/account"));

function Field({ label, type = "text", value, onChange, error, autoComplete, hint }: { label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; autoComplete?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const id = `a-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const isPw = type === "password";
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type={isPw && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required className={`input ${isPw ? "pr-11" : ""}`} aria-invalid={!!error} />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted hover:text-text" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFields(e.fields ?? {});
      } else setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, fields, run };
}

const Submit = ({ busy, children }: { busy: boolean; children: React.ReactNode }) => (
  <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink-900 font-semibold text-white hover:bg-ink-700 disabled:opacity-60">
    {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {children}
  </button>
);

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshCart } = useShop();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const s = useSubmit();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); s.run(async () => { await api("/account/login", { body: { email, password } }); await refreshCart(); router.push(safeNext(next)); router.refresh(); }); }}>
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={s.fields.email} />
      <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={s.fields.password} />
      <div className="text-right text-sm"><Link href={shopHref("/account/forgot")} className="font-semibold text-accent-ink hover:underline">Forgot password?</Link></div>
      <Submit busy={s.busy}>Sign in</Submit>
      <p className="text-center text-sm text-muted">New here? <Link href={shopHref(`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`)} className="font-semibold text-accent-ink hover:underline">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshCart } = useShop();
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "", marketingOptIn: false, website: "" });
  const s = useSubmit();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); s.run(async () => { await api("/account/register", { body: f }); await refreshCart(); router.push(next ? safeNext(next) : shopHref("/account?welcome=1")); router.refresh(); }); }}>
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      <Field label="Full name" autoComplete="name" value={f.fullName} onChange={(v) => setF({ ...f, fullName: v })} error={s.fields.fullName} />
      <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} error={s.fields.email} />
      <div>
        <label htmlFor="r-phone" className="field-label">Mobile number <span className="font-normal text-muted">(optional)</span></label>
        <input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input" aria-invalid={!!s.fields.phone} />
        {s.fields.phone && <p className="field-error">{s.fields.phone}</p>}
      </div>
      <Field label="Password" type="password" autoComplete="new-password" value={f.password} onChange={(v) => setF({ ...f, password: v })} error={s.fields.password} hint="At least 8 characters, with letters and a number" />
      <input tabIndex={-1} aria-hidden="true" className="hidden" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} autoComplete="off" />
      <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={f.marketingOptIn} onChange={(e) => setF({ ...f, marketingOptIn: e.target.checked })} /> Send me new products and offers</label>
      <Submit busy={s.busy}>Create account</Submit>
      <p className="text-center text-xs text-muted">By creating an account you agree to our <Link href={shopHref("/policies/terms")} className="underline">terms</Link> and <Link href={shopHref("/policies/privacy")} className="underline">privacy policy</Link>.</p>
      <p className="text-center text-sm text-muted">Already have an account? <Link href={shopHref("/account/login")} className="font-semibold text-accent-ink hover:underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const s = useSubmit();
  if (done) return <Notice tone="success">{done}</Notice>;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); s.run(async () => { const r = await api<{ message: string }>("/account/forgot", { body: { email } }); setDone(r.message); }); }}>
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={s.fields.email} />
      <Submit busy={s.busy}>Send reset link</Submit>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const s = useSubmit();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (password !== confirm) { s.run(async () => { throw new ApiError("The passwords don't match.", 400); }); return; } s.run(async () => { await api("/account/reset", { body: { token, password } }); router.push(shopHref("/account?reset=1")); router.refresh(); }); }}>
      {s.error && <Notice tone="danger">{s.error}</Notice>}
      <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={s.fields.password} hint="At least 8 characters, with letters and a number" />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      <Submit busy={s.busy}>Set new password</Submit>
    </form>
  );
}
