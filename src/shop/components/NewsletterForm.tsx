"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { api, ApiError } from "./api";

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done")
    return (
      <p className={`flex items-center gap-2 font-semibold ${tone === "dark" ? "text-white" : "text-text"}`} role="status">
        <CircleCheck className="h-5 w-5 text-accent" /> You&apos;re subscribed — watch your inbox for new drops.
      </p>
    );
  return (
    <form
      className="w-full max-w-md"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        try {
          await api("/newsletter", { body: { email, website: hp } });
          setState("done");
        } catch (err) {
          setError(err instanceof ApiError ? (err.fields?.email ?? err.message) : "Please try again.");
          setState("idle");
        }
      }}
    >
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={`h-12 min-w-0 flex-1 rounded-full border px-5 text-sm focus:outline-none focus:ring-4 focus:ring-accent/25 ${tone === "dark" ? "border-ink-600 bg-ink-850 text-white placeholder:text-ink-400" : "border-line bg-white"}`}
        />
        <input tabIndex={-1} aria-hidden="true" className="hidden" value={hp} onChange={(e) => setHp(e.target.value)} name="website" autoComplete="off" />
        <button type="submit" disabled={state === "busy"} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-ink-950 hover:bg-accent-soft disabled:opacity-60">
          {state === "busy" && <LoaderCircle className="h-4 w-4 animate-spin" />} Subscribe
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
    </form>
  );
}
