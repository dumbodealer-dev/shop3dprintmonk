"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle, Star } from "lucide-react";
import { shopHref } from "@/shop/config";
import { api, ApiError } from "./api";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ customer: unknown }>("/session").then((r) => setSignedIn(!!r.customer)).catch(() => setSignedIn(false));
  }, []);

  if (signedIn === null) return null;
  if (!signedIn)
    return (
      <p className="text-sm text-muted">
        <Link href={shopHref(`/account/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`)} className="font-semibold text-accent-ink underline">Sign in</Link> to write a review.
      </p>
    );
  if (msg?.ok) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{msg.text}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center rounded-full border border-line bg-white px-5 font-semibold hover:bg-paper">Write a review</button>;

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setMsg({ ok: false, text: "Choose a star rating." });
        setBusy(true);
        setMsg(null);
        try {
          const r = await api<{ message: string }>("/reviews", { body: { productId, rating, title, body: text } });
          setMsg({ ok: true, text: r.message });
        } catch (err) {
          setMsg({ ok: false, text: err instanceof ApiError ? (err.fields?.body ?? err.message) : "Couldn't submit your review." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset>
        <legend className="field-label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className="rounded p-0.5">
              <Star className={`h-7 w-7 ${n <= rating ? "fill-accent text-accent" : "text-ink-300"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="rv-title" className="field-label">Title <span className="font-normal text-muted">(optional)</span></label>
        <input id="rv-title" className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="rv-body" className="field-label">Your review</label>
        <textarea id="rv-body" className="input" rows={4} minLength={10} maxLength={3000} required value={text} onChange={(e) => setText(e.target.value)} placeholder="How's the print quality, size and finish?" />
      </div>
      {msg && !msg.ok && <p className="field-error" role="alert">{msg.text}</p>}
      <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-6 font-semibold text-white disabled:opacity-60">
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Submit review
      </button>
    </form>
  );
}
