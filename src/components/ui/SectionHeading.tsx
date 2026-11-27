import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  action,
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  id?: string;
}) {
  const center = align === "center";
  return (
    <div className={`flex flex-col gap-6 ${center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}>
      <div className={center ? "max-w-2xl" : "max-w-3xl"}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id} className="h-section mt-3">{title}</h2>
        {lead && <p className="lead mt-4">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
