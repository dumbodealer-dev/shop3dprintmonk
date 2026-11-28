import { getCustomer } from "@/shop/server/auth/customer";
import { renderInvoiceHtml } from "@/shop/server/invoice";
import { getOrderForViewer } from "@/shop/server/orders";
import { shopConfigured } from "@/shop/server/db";

export const dynamic = "force-dynamic";

/** GST invoice for the order owner (signed in, or holding the secret order link). ?download=1 saves it as a file. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  if (!shopConfigured()) return new Response("Invoice not available.", { status: 404 });
  const { number } = await ctx.params;
  const url = new URL(req.url);
  const customer = await getCustomer();
  const order = await getOrderForViewer(number, url.searchParams.get("key"), customer?.id ?? null);
  if (!order || !order.invoice_number) return new Response("Invoice not available.", { status: 404 });
  const html = await renderInvoiceHtml(order);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      ...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="invoice-${order.invoice_number.replace(/\//g, "-")}.html"` } : {}),
    },
  });
}
