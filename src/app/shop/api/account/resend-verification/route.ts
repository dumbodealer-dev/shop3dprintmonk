import { requireCustomer } from "@/shop/server/auth/customer";
import { issueToken } from "@/shop/server/auth/tokens";
import { json, route } from "@/shop/server/http";
import { sendVerification } from "@/shop/server/notifications";

export const POST = route(
  async () => {
    const c = await requireCustomer();
    if (c.emailVerified) return json({ ok: true, message: "Your email is already verified." });
    await sendVerification(c, await issueToken("customer", c.id, "verify_email"));
    return json({ ok: true, message: `We've sent a new link to ${c.email}.` });
  },
  { rate: ["resend", 3, 60 * 60_000] },
);
