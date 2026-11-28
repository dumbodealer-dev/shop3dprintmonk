import { authenticateCustomer, startCustomerSession } from "@/shop/server/auth/customer";
import { mergeGuestIntoCustomer } from "@/shop/server/cart";
import { body, json, route } from "@/shop/server/http";
import { loginSchema } from "@/shop/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { ShopError } from "@/shop/server/db";

export const POST = route(
  async (req) => {
    const input = loginSchema.parse(await body(req));
    if (!rateLimit(`shop:login-email:${input.email}`, 10, 15 * 60_000).ok) throw new ShopError("Too many attempts for this account. Please wait 15 minutes.", 429);
    const customer = await authenticateCustomer(input.email, input.password);
    await startCustomerSession(customer.id);
    await mergeGuestIntoCustomer(customer.id);
    return json({ ok: true });
  },
  { rate: ["login", 10, 10 * 60_000] },
);
