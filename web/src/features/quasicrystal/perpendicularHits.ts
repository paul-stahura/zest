export type LatticePoint = {
  i: number;
  j: number;
};

/** One lattice point sitting on the perpendicular through a zero. */
export type PerpendicularHit = {
  zeroIndex: number;
  lattice: LatticePoint;
};

export type PerpendicularQuery = {
  /** Distances of the dots along the ray, in the same units as each other. */
  zeros: readonly number[];
  /** Ray direction, radians, mathematical angle (y up). */
  angle: number;
  /** Screen pixels per lattice step. Wheel zoom changes only this. */
  gridScale: number;
  /** Screen pixels per unit of distance along the ray. Independent of gridScale. */
  zeroScale: number;
  /** How close, in screen pixels, a lattice point must sit to the perpendicular. */
  tolerancePx: number;
  /**
   * Longest yellow segment, in screen pixels. A lattice point farther from
   * the ray than this gets no line. Omitted means no distance cap.
   */
  maxDistancePx?: number;
  iMin: number;
  iMax: number;
  jMin: number;
  jMax: number;
};

/**
 * Lattice points whose foot on the ray is a zero dot.
 *
 * The perpendicular through the dot at distance R is the set of points with
 * the same projection onto the ray. A lattice point (i, j) lies on it when
 * (i cos θ + j sin θ) * gridScale is within tolerancePx of that zero's
 * screen distance. Grid zoom moves the lattice; it does not move the zeros.
 */
export function perpendicularHits(query: PerpendicularQuery): PerpendicularHit[] {
  const { zeros, angle, gridScale, zeroScale, tolerancePx, iMin, iMax, jMin, jMax } = query;
  if (gridScale <= 0 || zeroScale <= 0 || tolerancePx < 0 || zeros.length === 0) return [];
  if (iMin > iMax || jMin > jMax) return [];

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hits: PerpendicularHit[] = [];
  const solveAlongI = Math.abs(sin) >= Math.abs(cos);

  if (solveAlongI) {
    if (sin === 0) return hits;
    for (let i = iMin; i <= iMax; i += 1) {
      for (let k = 0; k < zeros.length; k += 1) {
        const target = zeros[k]! * zeroScale;
        const jExact = (target / gridScale - i * cos) / sin;
        const j = Math.round(jExact);
        if (j < jMin || j > jMax) continue;
        const along = (i * cos + j * sin) * gridScale;
        if (Math.abs(along - target) <= tolerancePx) {
          hits.push({ zeroIndex: k, lattice: { i, j } });
        }
      }
    }
    return hits;
  }

  if (cos === 0) return hits;
  for (let j = jMin; j <= jMax; j += 1) {
    for (let k = 0; k < zeros.length; k += 1) {
      const target = zeros[k]! * zeroScale;
      const iExact = (target / gridScale - j * sin) / cos;
      const i = Math.round(iExact);
      if (i < iMin || i > iMax) continue;
      const along = (i * cos + j * sin) * gridScale;
      if (Math.abs(along - target) <= tolerancePx) {
        hits.push({ zeroIndex: k, lattice: { i, j } });
      }
    }
  }
  return hits;
}

type RankedHit = {
  hit: PerpendicularHit;
  /** Distance from the lattice point to the rotating line. */
  distance: number;
  /** How far the lattice point sits from this zero's true perpendicular. */
  residual: number;
};

/**
 * For each zero, the lattice point on its perpendicular closest to the ray.
 * Two zeros never share a lattice point: the one whose segment is closer to
 * perpendicular keeps it, and the other takes its next-closest point.
 */
export function nearestPerpendicularHits(query: PerpendicularQuery): PerpendicularHit[] {
  const hits = perpendicularHits(query);
  const cos = Math.cos(query.angle);
  const sin = Math.sin(query.angle);
  const maxDistance = query.maxDistancePx ?? Number.POSITIVE_INFINITY;
  const byZero = new Map<number, RankedHit[]>();
  for (const hit of hits) {
    const distance = Math.abs(query.gridScale * (-hit.lattice.i * sin + hit.lattice.j * cos));
    if (distance > maxDistance) continue;
    const along = (hit.lattice.i * cos + hit.lattice.j * sin) * query.gridScale;
    const target = query.zeros[hit.zeroIndex]! * query.zeroScale;
    const ranked: RankedHit = { hit, distance, residual: Math.abs(along - target) };
    const list = byZero.get(hit.zeroIndex);
    if (list === undefined) byZero.set(hit.zeroIndex, [ranked]);
    else list.push(ranked);
  }
  for (const list of byZero.values()) {
    list.sort((a, b) => a.distance - b.distance || a.residual - b.residual);
  }

  const choice = new Map<number, number>();
  for (const zeroIndex of byZero.keys()) choice.set(zeroIndex, 0);

  let moved = true;
  while (moved) {
    moved = false;
    const claimants = [...byZero.keys()].filter((zeroIndex) => {
      const list = byZero.get(zeroIndex);
      const index = choice.get(zeroIndex);
      return list !== undefined && index !== undefined && index < list.length;
    });
    claimants.sort((a, b) => {
      const aHit = byZero.get(a)?.[choice.get(a) ?? 0];
      const bHit = byZero.get(b)?.[choice.get(b) ?? 0];
      return (aHit?.residual ?? 0) - (bHit?.residual ?? 0);
    });
    const taken = new Set<string>();
    for (const zeroIndex of claimants) {
      const ranked = byZero.get(zeroIndex)?.[choice.get(zeroIndex) ?? 0];
      if (ranked === undefined) continue;
      const key = `${String(ranked.hit.lattice.i)}:${String(ranked.hit.lattice.j)}`;
      if (taken.has(key)) {
        choice.set(zeroIndex, (choice.get(zeroIndex) ?? 0) + 1);
        moved = true;
      } else {
        taken.add(key);
      }
    }
  }

  const kept: PerpendicularHit[] = [];
  for (const [zeroIndex, index] of choice) {
    const ranked = byZero.get(zeroIndex)?.[index];
    if (ranked !== undefined) kept.push(ranked.hit);
  }
  return kept;
}

/**
 * Integer lattice window covering the view. Origin is in screen pixels
 * (y down). Lattice y grows upward.
 */
export function visibleLatticeBounds(
  cssW: number,
  cssH: number,
  gridScale: number,
  originX: number,
  originY: number,
): { iMin: number; iMax: number; jMin: number; jMax: number } {
  return {
    iMin: Math.floor((0 - originX) / gridScale) - 1,
    iMax: Math.ceil((cssW - originX) / gridScale) + 1,
    jMin: Math.floor((originY - cssH) / gridScale) - 1,
    jMax: Math.ceil(originY / gridScale) + 1,
  };
}
