import { registerCustomer, startCustomerSession } from "@/shop/server/auth/customer";
import { mergeGuestIntoCustomer } from "@/shop/server/cart";
import { body, json, route } from "@/shop/server/http";
import { sendWelcomeVerification } from "@/shop/server/notifications";
import { registerSchema } from "@/shop/lib/validation";

export const POST = route(
  async (req) => {
    const input = registerSchema.parse(await body(req));
    if (input.website) return json({ ok: true }, 201);
    const { customer, verifyToken } = await registerCustomer(input);
    await startCustomerSession(customer.id);
    await mergeGuestIntoCustomer(customer.id);
    await sendWelcomeVerification(customer, verifyToken);
    return json({ ok: true }, 201);
  },
  { rate: ["register", 5, 60 * 60_000] },
);
