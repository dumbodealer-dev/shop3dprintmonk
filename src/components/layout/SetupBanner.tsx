import { missingBusinessInfo } from "@/config/business";
import { integrations } from "@/lib/env";

/**
 * Visible reminder of configuration that is still missing. It disappears by
 * itself once everything is set. Hide early with SHOW_SETUP_BANNER=false.
 */
export function SetupBanner() {
  if (process.env.SHOW_SETUP_BANNER === "false") return null;
  const missing = [
    ...missingBusinessInfo(),
    ...(!integrations.database ? ["Database & file storage (Supabase)"] : []),
    ...(!integrations.email ? ["Email notifications (Resend)"] : []),
  ];
  if (missing.length === 0) return null;
  return (
    <div role="status" className="bg-amber-100 text-amber-950">
      <div className="container-x py-2 text-xs leading-relaxed sm:text-[0.8rem]">
        <strong className="font-semibold">Setup required before launch:</strong> {missing.join(" · ")}.{" "}
        <span className="opacity-75">See README → “Go-live checklist”.</span>
      </div>
    </div>
  );
}
