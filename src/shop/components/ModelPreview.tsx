"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import ModelViewer from "@/components/three/ModelViewer";
import { extensionOf } from "@/lib/files";

/** Loads a product's STL/OBJ/3MF from storage and shows it in the site's existing interactive 3D viewer. */
export default function ModelPreview({ url }: { url: string }) {
  const [positions, setPositions] = useState<Float32Array | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ext = extensionOf(new URL(url, window.location.href).pathname);
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (blob.size > 60 * 1024 * 1024) throw new Error("too large");
        const { loadModel } = await import("@/lib/three/load-model");
        const m = await loadModel(new File([blob], `model.${ext}`), ext);
        if (!cancelled) setPositions(m.positions);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-300">
        <TriangleAlert className="h-6 w-6 text-accent" /> 3D preview unavailable
      </div>
    );
  if (!positions)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-300">
        <LoaderCircle className="h-6 w-6 animate-spin text-accent" /> Loading 3D model…
      </div>
    );
  return <ModelViewer positions={positions} />;
}
