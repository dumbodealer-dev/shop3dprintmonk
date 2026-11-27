/**
 * Pure mesh analysis on a triangle soup (x,y,z per vertex, 3 vertices per
 * triangle, millimetres). Works in the browser and in Node.
 */
export type MeshAnalysis = {
  triangles: number;
  volumeMm3: number;
  areaMm2: number;
  size: [number, number, number];
  /** true / false when checked, null when skipped for very large meshes. */
  watertight: boolean | null;
  /**
   * Volume (mm³) of the space under overhangs that needs support, as uploaded
   * (Z-up): Σ projected overhang area × height above the build plate.
   * FDM supports overhangs steeper than 45°, resin (SLA) steeper than 30°.
   */
  supportFdmMm3: number;
  supportSlaMm3: number;
  overhangAreaMm2: number;
};

const FDM_OVERHANG_NZ = -Math.SQRT1_2; // 45° from vertical
const SLA_OVERHANG_NZ = -0.5; // resin: overhangs more than 30° from vertical need support
const ON_PLATE_MM = 0.5;

const MAX_EDGE_CHECK_TRIANGLES = 400_000;

export function analyzeTriangles(pos: ArrayLike<number>): MeshAnalysis {
  const n = Math.floor(pos.length / 9);
  let vol = 0;
  let area = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const ax = pos[o], ay = pos[o + 1], az = pos[o + 2];
    const bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5];
    const cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];
    // Signed volume of tetrahedron with origin (divergence theorem).
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
    minX = Math.min(minX, ax, bx, cx); maxX = Math.max(maxX, ax, bx, cx);
    minY = Math.min(minY, ay, by, cy); maxY = Math.max(maxY, ay, by, cy);
    minZ = Math.min(minZ, az, bz, cz); maxZ = Math.max(maxZ, az, bz, cz);
  }

  // Second pass: overhangs (needs minZ and winding direction from the first pass).
  const flip = vol < 0 ? -1 : 1; // inward-wound meshes have negative volume
  let supFdm = 0, supSla = 0, overhang = 0;
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2];
    const vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = (ux * vy - uy * vx) * flip;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len === 0 || nz >= 0) continue;
    const unitZ = nz / len;
    const h = (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3 - minZ;
    if (h < ON_PLATE_MM) continue; // resting on the build plate
    const projArea = -nz / 2; // area projected onto the plate
    if (unitZ < SLA_OVERHANG_NZ) supSla += projArea * h;
    if (unitZ < FDM_OVERHANG_NZ) {
      supFdm += projArea * h;
      overhang += len / 2;
    }
  }

  return {
    triangles: n,
    supportFdmMm3: supFdm,
    supportSlaMm3: supSla,
    overhangAreaMm2: overhang,
    volumeMm3: Math.abs(vol),
    areaMm2: area,
    size: n ? [maxX - minX, maxY - minY, maxZ - minZ] : [0, 0, 0],
    watertight: n <= MAX_EDGE_CHECK_TRIANGLES ? isWatertight(pos, n) : null,
  };
}

/** Every edge of a closed (manifold) mesh is shared by exactly two triangles. */
function isWatertight(pos: ArrayLike<number>, n: number): boolean {
  if (n < 4) return false;
  const q = (v: number) => Math.round(v * 1000);
  const key = (i: number) => `${q(pos[i])},${q(pos[i + 1])},${q(pos[i + 2])}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const k = [key(o), key(o + 3), key(o + 6)];
    for (let e = 0; e < 3; e++) {
      const a = k[e], b = k[(e + 1) % 3];
      if (a === b) continue;
      const id = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(id, (edges.get(id) ?? 0) + 1);
    }
  }
  for (const c of edges.values()) if (c !== 2) return false;
  return true;
}
