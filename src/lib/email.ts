import "server-only";
import { business } from "@/config/business";
import { integrations, serverEnv } from "./env";
import {
  CUSTOMER_TYPES,
  DESIGN_INPUTS,
  FINISHING_OPTIONS,
  TECHNOLOGIES,
  labelFor,
  type ContactSubmission,
  type QuoteSubmission,
} from "./validation";
import { formatBytes } from "./files";
import { whatsappLink } from "./whatsapp";

type SendResult = { ok: true; id: string } | { ok: false; error: string };

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
async function sendEmail(input: { to: string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<SendResult> {
  if (!integrations.email) return { ok: false, error: "Email service not configured" };
  try {
    const res = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: serverEnv.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !data.id) return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}

const esc = (s: string | number | undefined | null) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf6f2;font-family:Segoe UI,Arial,sans-serif;color:#1c120c">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9dfd6">
<tr><td style="background:#1c120c;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:.08em">3D PRINT<span style="color:#ff6a13">MONK</span></td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#faf6f2;color:#6b5d53;font-size:12px">${esc(business.name)} · ${esc(business.serviceArea.primary)} · ${esc(business.siteUrl)}</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(pairs: [string, string | number | undefined | null][]) {
  return `<table cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="color:#6b5d53;width:38%;vertical-align:top;border-bottom:1px solid #f2ebe4">${esc(k)}</td><td style="border-bottom:1px solid #f2ebe4;white-space:pre-wrap">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

function summaryPairs(q: QuoteSubmission): [string, string | number | undefined][] {
  return [
    ["Enquiry type", q.enquiryType],
    ["Project", q.project.title],
    ["Technology", labelFor(TECHNOLOGIES, q.project.technology)],
    ["Material", q.project.material],
    ["Quantity", q.project.quantity],
    ["Dimensions", q.project.dimensions],
    ["Needed by", q.project.deliveryDate],
    ["Application", q.project.application],
    ["Finishing", q.project.finishing.map((f) => labelFor(FINISHING_OPTIONS, f)).join(", ")],
    ["Design inputs", q.designInputs.map((d) => labelFor(DESIGN_INPUTS, d)).join(", ")],
    ["Needs design help", q.needsDesign ? "Yes" : "No"],
    ["Notes", q.project.notes],
    ["Online estimate", estimateText(q, true)],
  ];
}

const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
/** `internal` adds the support-material breakdown — team emails only, never sent to customers. */
function estimateText(q: QuoteSubmission, internal = false): string | undefined {
  const e = q.estimate;
  if (!e) return undefined;
  if (e.mode === "instant" && e.low != null && e.high != null)
    return `${inrFmt.format(e.low)} – ${inrFmt.format(e.high)} (preliminary, excl. GST & shipping${e.material ? `, ${e.material}` : ""})${
      internal && e.lines.length ? ` · ${e.lines.map((l) => `${l.name}: ≈${l.grams} g incl. ≈${l.supportGrams ?? 0} g supports × ${l.quantity}`).join("; ")}` : ""
    }`;
  return `Manual quote${e.reasons.length ? ` — ${e.reasons.join(" ")}` : ""}`;
}

export async function sendQuoteNotifications(args: {
  reference: string;
  submission: QuoteSubmission;
  fileLinks: { name: string; size: number; url: string | null }[];
}) {
  const { reference, submission: q, fileLinks } = args;
  const c = q.customer;

  const filesHtml = fileLinks.length
    ? `<h2 style="font-size:16px;margin:20px 0 8px">Files (${fileLinks.length})</h2><ul style="padding-left:18px;font-size:14px">${fileLinks
        .map(
          (f) =>
            `<li>${f.url ? `<a href="${esc(f.url)}">${esc(f.name)}</a>` : esc(f.name)} <span style="color:#6b5d53">(${formatBytes(f.size)})</span></li>`,
        )
        .join("")}</ul><p style="font-size:12px;color:#6b5d53">Private links — expire in ${serverEnv.downloadLinkDays} days. Files remain in Supabase Storage after that.</p>`
    : `<p style="font-size:14px;color:#6b5d53">No files attached.</p>`;

  const businessHtml = layout(
    `New ${q.enquiryType} enquiry · ${reference}`,
    `<h2 style="font-size:16px;margin:0 0 8px">Customer</h2>${rows([
      ["Name", c.fullName],
      ["Company", c.company],
      ["Email", c.email],
      ["Phone", c.phone],
      ["City", c.city],
      ["Customer type", labelFor(CUSTOMER_TYPES, c.customerType)],
    ])}<h2 style="font-size:16px;margin:20px 0 8px">Project</h2>${rows(summaryPairs(q))}${filesHtml}`,
  );

  const businessText = [
    `New ${q.enquiryType} enquiry ${reference}`,
    `${c.fullName} <${c.email}> ${c.phone} — ${c.city}`,
    ...summaryPairs(q)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`),
    ...fileLinks.map((f) => `File: ${f.name} ${f.url ?? ""}`),
  ].join("\n");

  const wa = whatsappLink(`Hello 3D PRINTMONK, my enquiry reference is ${reference}.`);
  const customerHtml = layout(
    "We've received your enquiry",
    `<p style="font-size:15px;line-height:1.6">Hi ${esc(c.fullName.split(" ")[0])},</p>
<p style="font-size:15px;line-height:1.6">Thank you for contacting ${esc(business.name)}. Our team will review your requirements and get back to you with questions or a quotation.</p>
<p style="font-size:15px">Your reference number: <strong style="font-family:monospace;font-size:17px">${esc(reference)}</strong></p>
${rows([...summaryPairs(q).slice(1, 7), ["Online estimate", estimateText(q)]])}
${q.estimate?.mode === "instant" ? `<p style="font-size:13px;color:#6b5d53">The online estimate is preliminary. Our team will review your files and confirm the final price before anything is printed.</p>` : ""}
${fileLinks.length ? `<p style="font-size:14px">Files received: ${fileLinks.map((f) => esc(f.name)).join(", ")}</p>` : ""}
<p style="font-size:14px;line-height:1.6;color:#475569">Please quote the reference number in any follow-up. You can reply directly to this email${wa ? ` or <a href="${esc(wa)}">message us on WhatsApp</a>` : ""}.</p>`,
  );

  const [toBusiness, toCustomer] = await Promise.all([
    sendEmail({
      to: serverEnv.businessNotificationEmails,
      subject: `[${reference}] ${q.project.title} — ${c.fullName}`,
      html: businessHtml,
      text: businessText,
      replyTo: c.email,
    }),
    sendEmail({
      to: [c.email],
      subject: `Your 3D PRINTMONK enquiry ${reference}`,
      html: customerHtml,
      text: `Thank you for contacting ${business.name}. Your reference number is ${reference}. Our team will review your requirements and get back to you.`,
      replyTo: business.contact.email ?? serverEnv.businessNotificationEmails[0],
    }),
  ]);

  return { business: toBusiness, customer: toCustomer };
}

export async function sendContactNotification(msg: ContactSubmission) {
  return sendEmail({
    to: serverEnv.businessNotificationEmails,
    subject: `Website message${msg.subject ? `: ${msg.subject}` : ""} — ${msg.name}`,
    html: layout(
      "New website message",
      rows([
        ["Name", msg.name],
        ["Email", msg.email],
        ["Phone", msg.phone],
        ["Subject", msg.subject],
        ["Message", msg.message],
      ]),
    ),
    text: `${msg.name} <${msg.email}> ${msg.phone ?? ""}\n\n${msg.message}`,
    replyTo: msg.email,
  });
}
