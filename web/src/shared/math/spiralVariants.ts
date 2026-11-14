import type { Point2 } from "@/shared/io/types";
import { indexToImag, spiralMiddleIndex, type ZetaSpiralGeometry } from "@/shared/math/zetaEms";
import { chiBrian } from "@/shared/math/zakCalculator";

function linkCount(index: number): number {
  return Math.floor(spiralMiddleIndex(index, 0)) + 2;
}

/**
 * Dirichlet eta spiral: η(s) = Σ (−1)^(n+1)/n^s (Unity `UpdateEtaFormula`).
 * Same link structure as EMS but each term's sign alternates.
 */
export function computeEtaSpiralGeometry(sigma: number, index: number, usePolyImag: boolean): ZetaSpiralGeometry {
  const imaginary = indexToImag(index, usePolyImag);
  const middleIndex = Math.trunc(index);
  const numLinks = linkCount(index) * 2;

  let x = 0, y = 0;
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let middlePoint: Point2 | null = null;

  for (let n = 1; n < numLinks; n++) {
    const sign = n % 2 === 1 ? 1 : -1;
    const angle = imaginary * Math.log(n);
    const r = sign * Math.pow(n, -sigma);
    const dx = r * Math.cos(angle);
    const dy = -r * Math.sin(angle);
    x += dx;
    y += dy;
    joints.push({ x, y });

    if (n === middleIndex + 1) {
      const prev = joints[joints.length - 2]!;
      middlePoint = { x: prev.x + dx / 2, y: prev.y + dy / 2 };
    }
  }

  return { joints, zeta: { x, y }, middleIndex, middlePoint, imaginary, numLinks };
}

/**
 * Zeta-prime spiral: ζ′(s) = −Σ ln(n)/n^s (Unity `UpdateSum1Prime`).
 * Same link structure as EMS but each term is weighted by −ln(n).
 *
 * The last link is grown by the fractional part of spiralMiddleIndex so the
 * endpoint is continuous when that index crosses an integer (T ≈ 6.177
 * for the first crossing above 6). Without that, floor() adds a whole new
 * term at once and the aimed/reflected copy jumps.
 */
export function computeZPrimeSpiralGeometry(sigma: number, index: number, usePolyImag: boolean): ZetaSpiralGeometry {
  const imaginary = indexToImag(index, usePolyImag);
  const middleIndex = Math.trunc(index);
  const mid = spiralMiddleIndex(index, 0);
  const nLastFull = Math.floor(mid) + 1;
  const frac = mid - Math.floor(mid);
  const numLinks = nLastFull + (frac > 0 ? 1 : 0) + 1;

  let x = 0, y = 0;
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let middlePoint: Point2 | null = null;

  const addTerm = (n: number, weight: number): void => {
    const angle = imaginary * Math.log(n);
    const r = -Math.log(n) * Math.pow(n, -sigma) * weight;
    const dx = r * Math.cos(angle);
    const dy = -r * Math.sin(angle);
    const prevX = x;
    const prevY = y;
    x += dx;
    y += dy;
    joints.push({ x, y });
    if (n === middleIndex + 1) {
      middlePoint = { x: prevX + dx / 2, y: prevY + dy / 2 };
    }
  };

  for (let n = 1; n <= nLastFull; n++) {
    addTerm(n, 1);
  }
  if (frac > 1e-15) {
    addTerm(nLastFull + 1, frac);
  }

  return { joints, zeta: { x, y }, middleIndex, middlePoint, imaginary, numLinks };
}

/**
 * Inverse-sum (RSInverseSum) spiral: χ(s) · Σ n^(s−1) (Unity `UpdateRsInverseSum`).
 *
 * By the functional equation ζ(s) = χ(s)·ζ(1−s), this spiral's endpoint
 * asymptotically approaches ζ(s), but winds from the opposite "direction."
 */
export function computeInverseSpiralGeometry(sigma: number, index: number, usePolyImag: boolean): ZetaSpiralGeometry {
  const imaginary = indexToImag(index, usePolyImag);
  const middleIndex = Math.trunc(index);
  const numLinks = linkCount(index);
  const chi = chiBrian({ re: sigma, im: imaginary });

  let rx = 0, ry = 0;
  const joints: Point2[] = [{ x: 0, y: 0 }];
  let middlePoint: Point2 | null = null;

  for (let n = 1; n < numLinks; n++) {
    // n^(s−1) = n^(σ−1) · e^(it·ln n)  [+it, not −it]
    const angle = imaginary * Math.log(n);
    const r = Math.pow(n, sigma - 1);
    const rawDx = r * Math.cos(angle);
    const rawDy = r * Math.sin(angle);
    rx += rawDx;
    ry += rawDy;

    // apply χ(s) scaling
    const jx = rx * chi.re - ry * chi.im;
    const jy = rx * chi.im + ry * chi.re;
    joints.push({ x: jx, y: jy });

    if (n === middleIndex + 1) {
      const prev = joints[joints.length - 2]!;
      const cdx = jx - prev.x;
      const cdy = jy - prev.y;
      middlePoint = { x: prev.x + cdx / 2, y: prev.y + cdy / 2 };
    }
  }

  const last = joints[joints.length - 1] ?? { x: 0, y: 0 };
  return { joints, zeta: last, middleIndex, middlePoint, imaginary, numLinks };
}
