import { createPasswordResetToken } from "@/shop/server/auth/customer";
import { body, json, route } from "@/shop/server/http";
import { sendPasswordReset } from "@/shop/server/notifications";
import { forgotSchema } from "@/shop/lib/validation";

/** Always answers the same way so it can't be used to discover which emails have accounts. */
export const POST = route(
  async (req) => {
    const { email } = forgotSchema.parse(await body(req));
    const r = await createPasswordResetToken(email);
    if (r) await sendPasswordReset(r.customer, r.token);
    return json({ ok: true, message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour." });
  },
  { rate: ["forgot", 5, 60 * 60_000] },
);
