"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Plane,
  PerspectiveCamera,
  PointLight,
  Scene,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Parametric "printable" objects: twisted vases with different cross-sections. */
const SHAPES = [
  { name: "TWIST VASE", material: "PETG", lobes: 6, lobeDepth: 0.09, twist: 1.6, profile: (t: number) => 0.62 + 0.38 * Math.sin(Math.PI * (0.15 + 0.8 * t)) },
  { name: "SPIRAL TOWER", material: "PLA", lobes: 4, lobeDepth: 0.16, twist: 2.6, profile: (t: number) => 0.95 - 0.35 * t },
  { name: "LAMP SHADE", material: "RESIN", lobes: 12, lobeDepth: 0.05, twist: -1.2, profile: (t: number) => 0.55 + 0.45 * Math.pow(Math.sin(Math.PI * t), 0.8) },
];
const HEIGHT = 2.4;
const LAYERS = 96;
const SEG = 120;
const PRINT_SECONDS = 10;
const HOLD_SECONDS = 2.5;

function radiusAt(shape: (typeof SHAPES)[number], theta: number, y: number) {
  const t = y / HEIGHT;
  return 0.95 * shape.profile(t) * (1 + shape.lobeDepth * Math.cos(shape.lobes * (theta + shape.twist * t)));
}

/** Layered shell geometry — each layer is a separate band so layer lines read clearly. */
function buildShape(shape: (typeof SHAPES)[number]): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c1 = new Color("#ff6a13");
  const c2 = new Color("#e2560a");
  for (let l = 0; l < LAYERS; l++) {
    const y0 = (l / LAYERS) * HEIGHT;
    const y1 = ((l + 1) / LAYERS) * HEIGHT;
    const c = l % 2 ? c1 : c2;
    const base = pos.length / 3;
    for (let s = 0; s <= SEG; s++) {
      const th = (s / SEG) * Math.PI * 2;
      for (const y of [y0, y1]) {
        const r = radiusAt(shape, th, y) * (y === y1 ? 0.998 : 1); // tiny inset = visible ridge
        pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < SEG; s++) {
      const a = base + s * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  // Solid first layer (base cap)
  const center = pos.length / 3;
  pos.push(0, 0.004, 0);
  col.push(c2.r, c2.g, c2.b);
  for (let s = 0; s <= SEG; s++) {
    const th = (s / SEG) * Math.PI * 2;
    const r = radiusAt(shape, th, 0);
    pos.push(Math.cos(th) * r, 0.004, Math.sin(th) * r);
    col.push(c2.r, c2.g, c2.b);
    if (s < SEG) idx.push(center, center + 2 + s, center + 1 + s);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default function HeroPrintScene({ onReady }: { onReady?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.localClippingEnabled = true;
    renderer.domElement.className = "h-full w-full";
    renderer.domElement.style.touchAction = "pan-y";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(5.3, 3.7, 5.3);

    scene.add(new AmbientLight(0xffe6d6, 0.55));
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new DirectionalLight(0xff8a3d, 1.6);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    // Build plate
    const plate = new Mesh(new BoxGeometry(3.8, 0.1, 3.8), new MeshStandardMaterial({ color: 0x1f1712, roughness: 0.6, metalness: 0.3 }));
    plate.position.y = -0.05;
    scene.add(plate);
    const grid = new GridHelper(3.8, 19, 0xff6a13, 0x43342a);
    grid.position.y = 0.002;
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    scene.add(grid);

    // Printed part (revealed by a rising clipping plane)
    const clip = new Plane(new Vector3(0, -1, 0), 0);
    const partMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, side: DoubleSide, clippingPlanes: [clip] });
    let shapeIndex = 0;
    const part = new Mesh(buildShape(SHAPES[0]), partMat);
    scene.add(part);

    // Print head: carriage, hot-end, nozzle, glow
    const head = new Group();
    const block = new Mesh(new BoxGeometry(0.42, 0.32, 0.42), new MeshStandardMaterial({ color: 0x2e231c, metalness: 0.6, roughness: 0.35 }));
    block.position.y = 0.42;
    const heater = new Mesh(new BoxGeometry(0.26, 0.12, 0.26), new MeshStandardMaterial({ color: 0xbcafa5, metalness: 0.8, roughness: 0.25 }));
    heater.position.y = 0.2;
    const nozzle = new Mesh(new ConeGeometry(0.075, 0.14, 24), new MeshStandardMaterial({ color: 0xd9a441, metalness: 0.9, roughness: 0.2 }));
    nozzle.rotation.x = Math.PI;
    nozzle.position.y = 0.08;
    const glow = new PointLight(0xff7a26, 2.2, 1.6, 2);
    glow.position.y = 0.02;
    const tip = new Mesh(new IcosahedronGeometry(0.035, 1), new MeshBasicMaterial({ color: 0xffb070 }));
    head.add(block, heater, nozzle, glow, tip);
    scene.add(head);
    // Gantry rail
    const rail = new Mesh(new CylinderGeometry(0.035, 0.035, 4.6, 12), new MeshStandardMaterial({ color: 0x8f8177, metalness: 0.8, roughness: 0.3 }));
    rail.rotation.z = Math.PI / 2;
    scene.add(rail);

    // Floating wireframe objects for depth
    const floaters: Mesh[] = [];
    const wire = (geo: BufferGeometry, x: number, y: number, z: number, s: number) => {
      const m = new Mesh(geo, new MeshBasicMaterial({ color: 0xff6a13, wireframe: true, transparent: true, opacity: 0.28 }));
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      scene.add(m);
      floaters.push(m);
    };
    wire(new IcosahedronGeometry(1, 1), -2.6, 2.6, -1.2, 0.38);
    wire(new TorusKnotGeometry(0.6, 0.18, 80, 10), 2.4, 2.9, -1.8, 0.42);
    wire(new IcosahedronGeometry(1, 0), 2.2, 0.9, 2.3, 0.22);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.05, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.7;
    controls.minPolarAngle = 0.6;
    controls.maxPolarAngle = 1.45;
    controls.enableRotate = window.matchMedia("(pointer: fine)").matches; // don't trap page scroll on touch
    controls.update();

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
    let last = performance.now();
    let t = reduced ? PRINT_SECONDS : 0.6;
    let lastHud = -1;
    let ready = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      if (now - last < 24) return; // ~40 fps is plenty and halves GPU/CPU use
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduced) t += dt;

      if (t > PRINT_SECONDS + HOLD_SECONDS) {
        t = 0;
        shapeIndex = (shapeIndex + 1) % SHAPES.length;
        part.geometry.dispose();
        part.geometry = buildShape(SHAPES[shapeIndex]);
      }
      const shape = SHAPES[shapeIndex];
      const progress = Math.min(t / PRINT_SECONDS, 1);
      const h = progress * HEIGHT;
      clip.constant = h;

      // Nozzle traces the outline of the current layer; parks above when done.
      const theta = t * 9;
      if (progress < 1) {
        const r = radiusAt(shape, theta, h);
        head.position.set(Math.cos(theta) * r, h + 0.01, Math.sin(theta) * r);
        glow.intensity = 2 + Math.sin(now / 60) * 0.4;
      } else {
        head.position.lerp(new Vector3(1.6, HEIGHT + 0.5, 0.6), 0.05);
        glow.intensity = 0.4;
      }
      rail.position.set(0, head.position.y + 0.42, head.position.z);
      floaters.forEach((f, i) => {
        f.rotation.x += dt * (0.12 + i * 0.05);
        f.rotation.y += dt * (0.18 + i * 0.04);
        f.position.y += Math.sin(now / 1400 + i * 2) * 0.0012;
      });

      const layer = Math.min(LAYERS, Math.floor(progress * LAYERS));
      if (hudRef.current && layer !== lastHud) {
        lastHud = layer;
        hudRef.current.textContent =
          progress < 1
            ? `LIVE PRINT · ${shape.material} · ${shape.name} · LAYER ${String(layer).padStart(3, "0")}/${LAYERS}`
            : `PRINT COMPLETE · ${shape.name} · READY FOR FINISHING`;
      }

      controls.update();
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        onReady?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
      <p ref={hudRef} className="pointer-events-none absolute bottom-4 left-4 right-4 truncate font-mono text-[0.68rem] tracking-[0.14em] text-accent-soft" aria-hidden="true" />
    </div>
  );
}
