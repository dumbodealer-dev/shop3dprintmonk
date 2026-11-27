import { business } from "@/config/business";

export const WHATSAPP_MESSAGES = {
  general: "Hello 3D PRINTMONK, I would like a quotation for a custom 3D printing project.",
  fdm: "Hello 3D PRINTMONK, I would like a quotation for FDM 3D printing.",
  sla: "Hello 3D PRINTMONK, I would like a quotation for SLA resin 3D printing.",
  bulk: "Hello 3D PRINTMONK, I would like to discuss a bulk / batch 3D printing order.",
  design: "Hello 3D PRINTMONK, I need help creating a 3D design for my project.",
  finishing: "Hello 3D PRINTMONK, I would like to ask about sanding, painting and finishing.",
  contact: "Hello 3D PRINTMONK, I have a question about 3D printing.",
} as const;

export type WhatsAppContext = keyof typeof WHATSAPP_MESSAGES;

export function whatsappNumber(): string | null {
  const digits = business.contact.whatsapp?.replace(/\D/g, "");
  return digits && digits.length >= 10 ? digits : null;
}

/** Returns a wa.me click-to-chat link, or null when no verified number is configured. */
export function whatsappLink(context: WhatsAppContext | string = "general"): string | null {
  const number = whatsappNumber();
  if (!number) return null;
  const text = context in WHATSAPP_MESSAGES ? WHATSAPP_MESSAGES[context as WhatsAppContext] : context;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
