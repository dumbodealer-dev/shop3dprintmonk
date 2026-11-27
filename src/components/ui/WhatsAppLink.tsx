import { whatsappLink, type WhatsAppContext } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./BrandIcons";
import { buttonClass } from "./Button";

type Props = {
  context?: WhatsAppContext | string;
  label?: string;
  variant?: "solid" | "outline-dark" | "outline-light";
  size?: "md" | "lg" | "sm";
  className?: string;
};

const styles = {
  solid: "bg-[#1fae5b] text-white hover:bg-[#178a48]",
  "outline-dark": "border border-ink-600 text-white hover:border-[#25d366] hover:text-[#5be08f]",
  "outline-light": "border border-line bg-white text-text hover:border-[#25d366]",
};

/**
 * WhatsApp click-to-chat button. Renders nothing until a verified WhatsApp
 * number is set in src/config/business.ts — so no dead buttons ship.
 */
export function WhatsAppLink({ context = "general", label = "Chat on WhatsApp", variant = "solid", size = "md", className = "" }: Props) {
  const href = whatsappLink(context);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-wa-context={typeof context === "string" && context.length < 20 ? context : "custom"}
      className={`${buttonClass("plain", size)} ${styles[variant]} ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      {label}
    </a>
  );
}
