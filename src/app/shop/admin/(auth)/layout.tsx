import { Boxes } from "lucide-react";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark-band tech-grid flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-8 text-text shadow-2xl">
        <p className="flex items-center gap-2 font-extrabold tracking-[0.06em]"><Boxes className="h-6 w-6 text-accent" /> 3D PRINTMONK <span className="rounded bg-ink-900 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-widest text-white">ADMIN</span></p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
