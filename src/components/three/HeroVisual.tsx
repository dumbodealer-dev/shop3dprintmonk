"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const HeroPrintScene = dynamic(() => import("./HeroPrintScene"), { ssr: false });

/**
 * Only run the live scene where it will be smooth: hardware-accelerated WebGL,
 * enough CPU cores, no data-saver. Others keep the static illustration.
 */
function canRunScene() {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if ((nav.hardwareConcurrency ?? 4) < 4) return false;
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/**
 * Shows the static illustration first (fast LCP), then swaps in the live 3D
 * print scene once the browser is idle. Falls back silently without WebGL.
 */
export function HeroVisual({ fallback }: { fallback: ReactNode }) {
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canRunScene()) return;
    const start = () => setLoad(true);
    const idle = "requestIdleCallback" in window;
    const id = idle ? window.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div className="relative aspect-[4/3.4] w-full">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>{fallback}</div>
      {load && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} role="img" aria-label="Animated 3D printer printing a part layer by layer">
          <HeroPrintScene onReady={onReady} />
        </div>
      )}
    </div>
  );
}
