import { z } from "zod";
import { changeCustomerPassword, requireCustomer } from "@/shop/server/auth/customer";
import { body, json, route } from "@/shop/server/http";
import { passwordSchema } from "@/shop/lib/validation";

export const POST = route(
  async (req) => {
    const c = await requireCustomer();
    const { current, next } = z.object({ current: z.string().min(1).max(200), next: passwordSchema }).parse(await body(req));
    await changeCustomerPassword(c.id, current, next);
    return json({ ok: true });
  },
  { rate: ["password", 10, 60 * 60_000] },
);
