/**
 * Isometric line illustrations used where real project photography has not
 * been supplied yet. Pure SVG (no JS, no image requests).
 */

type Variant = "hero" | "fdm" | "sla" | "bulk" | "design" | "finishing" | "generic";

const C = { stroke: "#ff6a13", top: "#2e231c", right: "#1f1712", left: "#18110d", faint: "#43342a" };
const iso = (x: number, y: number, z: number): [number, number] => [(x - y) * 0.866, (x + y) * 0.5 - z];
const pts = (list: [number, number, number][]) => list.map((p) => iso(...p).map((n) => n.toFixed(1)).join(",")).join(" ");

function Box({ x, y, z = 0, w, d, h, dashed = false }: { x: number; y: number; z?: number; w: number; d: number; h: number; dashed?: boolean }) {
  const s = { stroke: C.stroke, strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeDasharray: dashed ? "5 5" : undefined };
  return (
    <g>
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={dashed ? "none" : C.right} {...s} />
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={dashed ? "none" : C.left} {...s} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={dashed ? "none" : C.top} {...s} />
    </g>
  );
}

function Cylinder({ cx, cy, z = 0, r, h, layers = 0, smoothFrom }: { cx: number; cy: number; z?: number; r: number; h: number; layers?: number; smoothFrom?: number }) {
  const rx = r * 1.2247;
  const ry = r * 0.7071;
  const [bx, by] = iso(cx, cy, z);
  const ty = by - h;
  const lines = [];
  for (let i = 1; i < layers; i++) {
    const ly = by - (h * i) / layers;
    if (smoothFrom !== undefined && i / layers > smoothFrom) break;
    lines.push(<path key={i} d={`M${bx - rx},${ly} A${rx},${ry} 0 0 0 ${bx + rx},${ly}`} fill="none" stroke={C.stroke} strokeOpacity={0.35} strokeWidth={0.9} />);
  }
  return (
    <g>
      <path d={`M${bx - rx},${by} L${bx - rx},${ty} L${bx + rx},${ty} L${bx + rx},${by} A${rx},${ry} 0 0 1 ${bx - rx},${by} Z`} fill={C.right} stroke={C.stroke} strokeWidth={1.4} />
      {lines}
      <ellipse cx={bx} cy={ty} rx={rx} ry={ry} fill={C.top} stroke={C.stroke} strokeWidth={1.4} />
      <ellipse cx={bx} cy={ty} rx={rx * 0.62} ry={ry * 0.62} fill={C.left} stroke={C.stroke} strokeOpacity={0.6} strokeWidth={1} />
    </g>
  );
}

function Label({ at, dx, dy, text }: { at: [number, number, number]; dx: number; dy: number; text: string }) {
  const [x, y] = iso(...at);
  const anchor = dx < 0 ? "end" : "start";
  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={C.stroke} />
      <path d={`M${x},${y} l${dx * 0.6},${dy} h${dx * 0.4}`} fill="none" stroke={C.stroke} strokeOpacity={0.6} strokeWidth={1} />
      <text x={x + dx + (dx < 0 ? -6 : 6)} y={y + dy + 4} textAnchor={anchor} fill="#bcafa5" fontSize={11} fontFamily="var(--font-mono), monospace" letterSpacing="0.08em">
        {text}
      </text>
    </g>
  );
}

function Plate({ size = 300 }: { size?: number }) {
  const grid = [];
  for (let i = 30; i < size; i += 30) {
    grid.push(<polyline key={`a${i}`} points={pts([[i, 0, 0], [i, size, 0]])} stroke={C.faint} strokeWidth={0.8} fill="none" />);
    grid.push(<polyline key={`b${i}`} points={pts([[0, i, 0], [size, i, 0]])} stroke={C.faint} strokeWidth={0.8} fill="none" />);
  }
  return (
    <g>
      <Box x={0} y={0} z={-12} w={size} d={size} h={12} />
      {grid}
    </g>
  );
}

function Bracket({ x, y }: { x: number; y: number }) {
  const holes = [x + 75, x + 105].map((hx) => {
    const [ex, ey] = iso(hx, y + 25, 16);
    return <ellipse key={hx} cx={ex} cy={ey} rx={9} ry={5.2} fill={C.left} stroke={C.stroke} strokeWidth={1.1} />;
  });
  return (
    <g>
      <Box x={x} y={y} w={22} d={50} h={95} />
      <Box x={x + 22} y={y} w={100} d={50} h={16} />
      {holes}
    </g>
  );
}

function Batch({ x, y, n = 3, size = 24, gap = 10 }: { x: number; y: number; n?: number; size?: number; gap?: number }) {
  const items = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) items.push([x + i * (size + gap), y + j * (size + gap)]);
  return (
    <g>
      {items
        .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
        .map(([bx, by]) => (
          <Box key={`${bx}-${by}`} x={bx} y={by} w={size} d={size} h={size} />
        ))}
    </g>
  );
}

function Gem({ x, y, z = 0, s = 1 }: { x: number; y: number; z?: number; s?: number }) {
  // Faceted figure / jewellery-like form: suggests fine resin detail.
  const [cx, cy] = iso(x, y, z);
  const p = (dx: number, dy: number) => `${cx + dx * s},${cy + dy * s}`;
  return (
    <g stroke={C.stroke} strokeWidth={1.3} strokeLinejoin="round">
      <polygon points={[p(0, -120), p(44, -70), p(0, 0), p(-44, -70)].join(" ")} fill={C.right} />
      <polygon points={[p(0, -120), p(-44, -70), p(0, -58)].join(" ")} fill={C.top} />
      <polygon points={[p(0, -120), p(44, -70), p(0, -58)].join(" ")} fill={C.left} />
      <polyline points={[p(-44, -70), p(0, -58), p(44, -70)].join(" ")} fill="none" />
      <polyline points={[p(0, -58), p(0, 0)].join(" ")} fill="none" strokeOpacity={0.5} />
      <polyline points={[p(-22, -64), p(0, 0), p(22, -64)].join(" ")} fill="none" strokeOpacity={0.35} />
    </g>
  );
}

function DimensionLine({ from, to, label }: { from: [number, number, number]; to: [number, number, number]; label: string }) {
  const [x1, y1] = iso(...from);
  const [x2, y2] = iso(...to);
  return (
    <g stroke={C.stroke} strokeWidth={1} fill="none" strokeOpacity={0.8}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="3 4" />
      <circle cx={x1} cy={y1} r={2.5} fill={C.stroke} />
      <circle cx={x2} cy={y2} r={2.5} fill={C.stroke} />
      <text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2 - 6} fill="#bcafa5" stroke="none" fontSize={11} fontFamily="var(--font-mono), monospace">
        {label}
      </text>
    </g>
  );
}

export function TechIllustration({ variant = "generic", className = "", title }: { variant?: Variant; className?: string; title?: string }) {
  const label = title ?? "Technical illustration of 3D printed parts";
  return (
    <svg viewBox="-300 -120 600 470" className={className} role="img" aria-label={label}>
      <title>{label}</title>
      <Plate />
      {variant === "hero" && (
        <>
          <Bracket x={28} y={36} />
          <Cylinder cx={225} cy={70} r={38} h={128} layers={22} />
          <Batch x={70} y={175} />
          <Gem x={235} y={215} s={0.75} />
          <Label at={[28, 60, 95]} dx={-70} dy={-30} text="FDM · BRACKET" />
          <Label at={[225, 70, 128]} dx={60} dy={-30} text="PROTOTYPE" />
          <Label at={[235, 215, 40]} dx={70} dy={40} text="SLA · DETAIL" />
          <Label at={[70, 260, 24]} dx={-60} dy={30} text="BATCH × 9" />
        </>
      )}
      {variant === "fdm" && (
        <>
          <Bracket x={40} y={60} />
          <Cylinder cx={215} cy={190} r={40} h={120} layers={24} />
          <Label at={[215, 190, 120]} dx={60} dy={-26} text="LAYER BY LAYER" />
        </>
      )}
      {variant === "sla" && (
        <>
          <Gem x={150} y={150} s={1.25} />
          <Gem x={250} y={80} s={0.6} />
          <Gem x={80} y={250} s={0.6} />
          <Label at={[150, 150, 150]} dx={60} dy={-20} text="FINE DETAIL" />
        </>
      )}
      {variant === "bulk" && (
        <>
          <Batch x={40} y={40} n={5} size={28} gap={18} />
          <Label at={[40, 40, 28]} dx={-60} dy={-30} text="REPEATABLE" />
        </>
      )}
      {variant === "design" && (
        <>
          <Box x={60} y={70} w={170} d={120} h={90} dashed />
          <Box x={90} y={100} w={70} d={60} h={60} />
          <DimensionLine from={[60, 210, 0]} to={[230, 210, 0]} label="W" />
          <DimensionLine from={[250, 70, 0]} to={[250, 190, 0]} label="D" />
          <DimensionLine from={[230, 190, 0]} to={[230, 190, 90]} label="H" />
        </>
      )}
      {variant === "finishing" && (
        <>
          <Cylinder cx={110} cy={150} r={50} h={140} layers={26} />
          <Cylinder cx={240} cy={110} r={40} h={120} layers={22} smoothFrom={0} />
          <Label at={[110, 150, 140]} dx={-60} dy={-26} text="AS PRINTED" />
          <Label at={[240, 110, 120]} dx={60} dy={-26} text="FINISHED" />
        </>
      )}
      {variant === "generic" && (
        <>
          <Bracket x={50} y={90} />
          <Batch x={190} y={190} n={2} />
        </>
      )}
    </svg>
  );
}

/** Placeholder panel for a missing real photo (keeps layouts stable). */
export function PhotoPlaceholder({ variant = "generic", label, className = "" }: { variant?: Variant; label: string; className?: string }) {
  return (
    <div className={`tech-grid relative flex items-center justify-center overflow-hidden bg-ink-900 ${className}`}>
      <TechIllustration variant={variant} className="h-full w-full p-4" title={label} />
    </div>
  );
}
