import type { CSSProperties } from "react";

type Shape = "cube" | "pyramid" | "layers" | "gem";

/**
 * Lightweight CSS-only 3D objects (no WebGL, no JS). Decorative: hidden from
 * assistive tech and frozen when the visitor prefers reduced motion.
 */
export function Floating3D({ shape = "cube", size = 96, className = "", delay = 0, speed = 18 }: { shape?: Shape; size?: number; className?: string; delay?: number; speed?: number }) {
  const style = { "--s": `${size}px`, "--d": `${delay}s`, "--t": `${speed}s` } as CSSProperties;
  return (
    <div className={`f3d pointer-events-none ${className}`} style={style} aria-hidden="true">
      <div className="f3d-bob">
        <div className="f3d-spin">
          {shape === "cube" && ["front", "back", "left", "right", "top", "bottom"].map((f) => <span key={f} className={`f3d-face f3d-cube-${f}`} />)}
          {shape === "pyramid" && (
            <>
              {[0, 90, 180, 270].map((r) => (
                <span key={r} className="f3d-tri" style={{ "--r": `${r}deg` } as CSSProperties} />
              ))}
            </>
          )}
          {shape === "layers" &&
            Array.from({ length: 9 }, (_, i) => <span key={i} className="f3d-layer" style={{ "--i": i } as CSSProperties} />)}
          {shape === "gem" && (
            <>
              {[0, 90, 180, 270].map((r) => (
                <span key={`t${r}`} className="f3d-tri" style={{ "--r": `${r}deg` } as CSSProperties} />
              ))}
              {[0, 90, 180, 270].map((r) => (
                <span key={`b${r}`} className="f3d-tri f3d-tri-down" style={{ "--r": `${r}deg` } as CSSProperties} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
