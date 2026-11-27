"use client";

/**
 * Parses STL / OBJ / 3MF files in the browser into a single triangle soup
 * (millimetres). Loaded lazily — three.js is only downloaded when a customer
 * adds a 3D file.
 */
import { BufferGeometry, Float32BufferAttribute, Mesh, type Object3D } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { analyzeTriangles, type MeshAnalysis } from "@/lib/pricing/mesh";

export type LoadedModel = { positions: Float32Array; analysis: MeshAnalysis };

function soupFromObject(root: Object3D): Float32Array {
  root.updateMatrixWorld(true);
  const chunks: Float32Array[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    let g = (o.geometry as BufferGeometry).clone();
    if (g.index) g = g.toNonIndexed();
    g.applyMatrix4(o.matrixWorld);
    chunks.push(g.getAttribute("position").array as Float32Array);
    g.dispose();
  });
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function loadModel(file: File, ext: string): Promise<LoadedModel> {
  let positions: Float32Array;
  if (ext === "stl") {
    const g = new STLLoader().parse(await file.arrayBuffer());
    positions = (g.index ? g.toNonIndexed() : g).getAttribute("position").array as Float32Array;
  } else if (ext === "obj") {
    positions = soupFromObject(new OBJLoader().parse(await file.text()));
  } else if (ext === "3mf") {
    positions = soupFromObject(new ThreeMFLoader().parse(await file.arrayBuffer()));
  } else {
    throw new Error("Unsupported format");
  }
  if (!positions.length) throw new Error("No geometry found");
  return { positions, analysis: analyzeTriangles(positions) };
}

/** Geometry for display, centred on the build plate (Z-up files shown upright). */
export function displayGeometry(positions: Float32Array): BufferGeometry {
  let g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  // Shared vertices give smooth shading; skip on very large meshes to stay responsive.
  if (positions.length / 9 < 600_000) g = mergeVertices(g, 1e-4);
  g.rotateX(-Math.PI / 2); // CAD/STL convention is Z-up; three.js is Y-up
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
