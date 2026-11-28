import { Boxes } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
      <div className="dark-band tech-grid hidden min-h-[460px] flex-col justify-end rounded-[var(--radius-card)] p-10 lg:flex">
        <Boxes className="h-10 w-10 text-accent" />
        <h2 className="mt-6 text-3xl font-extrabold">Your 3D PRINTMONK account</h2>
        <ul className="mt-4 space-y-2 text-ink-300">
          <li>· Track orders and download GST invoices</li>
          <li>· Save addresses for one-tap checkout</li>
          <li>· Keep your cart and wishlist on every device</li>
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
