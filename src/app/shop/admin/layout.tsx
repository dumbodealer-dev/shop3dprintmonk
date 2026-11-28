import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Shop admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
