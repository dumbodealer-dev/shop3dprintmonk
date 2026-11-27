"use client";

import { useEffect, useRef, useState } from "react";
import {
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box, RotateCcw } from "lucide-react";
import { displayGeometry } from "@/lib/three/load-model";

/**
 * Interactive 3D preview of a customer's model: drag to rotate, scroll/pinch
 * to zoom. Renders only while visible.
 */
export default function ModelViewer({ positions, color = "#ff6a13" }: { positions: Float32Array; color?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const [wire, setWire] = useState(false);
  const matRef = useRef<MeshStandardMaterial | null>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.className = "h-full w-full touch-none";

    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 100000);
    scene.add(new HemisphereLight(0xfff1e6, 0x2e231c, 1.2));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const rim = new DirectionalLight(0xff9a52, 1.2);
    rim.position.set(-2, 1, -1.5);
    scene.add(rim);

    const geometry = displayGeometry(positions);
    const material = new MeshStandardMaterial({ color: new Color(color), roughness: 0.55, metalness: 0.05 });
    matRef.current = material;
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const r = geometry.boundingSphere!.radius || 10;
    const grid = new GridHelper(r * 4, 20, 0x8f8177, 0x43342a);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.6;
    const reset = () => {
      const h = geometry.boundingBox!.max.y;
      controls.target.set(0, h / 2, 0);
      camera.position.set(r * 1.9, h / 2 + r * 1.2, r * 1.9);
      camera.near = r / 100;
      camera.far = r * 100;
      camera.updateProjectionMatrix();
      controls.update();
    };
    reset();
    resetRef.current = reset;
    controls.addEventListener("start", () => (controls.autoRotate = false));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      grid.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [positions, color]);

  useEffect(() => {
    if (matRef.current) matRef.current.wireframe = wire;
  }, [wire]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" />
      <div className="absolute right-3 top-3 flex gap-1.5">
        <button type="button" onClick={() => setWire((w) => !w)} aria-pressed={wire} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-900/80 px-3 text-xs font-semibold text-white backdrop-blur hover:bg-ink-700">
          <Box className="h-3.5 w-3.5" aria-hidden="true" /> {wire ? "Solid" : "Wireframe"}
        </button>
        <button type="button" onClick={() => resetRef.current()} aria-label="Reset view" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/80 text-white backdrop-blur hover:bg-ink-700">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-900/70 px-3 py-1 text-[0.7rem] text-ink-200 backdrop-blur">Drag to rotate · scroll to zoom</p>
    </div>
  );
}
