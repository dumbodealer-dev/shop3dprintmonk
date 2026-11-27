"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Honeypot, TextArea, TextField } from "./fields";

export function ContactForm({ configured }: { configured: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [v, setV] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...v, startedAt };
    const r = contactSchema.safeParse(payload);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setState("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error ?? "Something went wrong");
      }
      track("contact_submit");
      setState("sent");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="card flex flex-col items-center p-10 text-center">
        <CircleCheck className="h-12 w-12 text-success" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold">Message sent</h3>
        <p className="mt-2 text-muted">Thank you — we&apos;ll get back to you soon. For a project quote, the quote form lets you attach files.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card relative grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <Honeypot value={v.website} onChange={set("website")} />
      {!configured && (
        <p role="status" className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          The contact form isn&apos;t connected yet (database not configured). Please use the phone, email or WhatsApp details on this page.
        </p>
      )}
      <TextField label="Name" name="name" required autoComplete="name" value={v.name} onChange={set("name")} error={errors.name} />
      <TextField label="Email" name="email" type="email" required autoComplete="email" value={v.email} onChange={set("email")} error={errors.email} />
      <TextField label="Phone" name="phone" type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} error={errors.phone} />
      <TextField label="Subject" name="subject" value={v.subject} onChange={set("subject")} error={errors.subject} />
      <TextArea label="Message" name="message" required rows={5} className="sm:col-span-2" value={v.message} onChange={set("message")} error={errors.message} />
      {state === "error" && <p role="alert" className="text-sm text-danger sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={state === "sending" || !configured}>
          {state === "sending" ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : "Send message"}
        </Button>
      </div>
    </form>
  );
}
