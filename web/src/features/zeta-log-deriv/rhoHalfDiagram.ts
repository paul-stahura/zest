export type PlanePoint = {
  readonly x: number;
  readonly y: number;
};

export type RhoHalfDiagram = {
  /** Dashed segment from the origin to w. */
  segment: readonly [PlanePoint, PlanePoint];
  /** Perpendicular bisector of that segment, the level Re ρ = 1/2. */
  bisector: readonly [PlanePoint, PlanePoint];
  /** Open square corner at the midpoint, in the angle between w and the bisector. */
  rightAngle: readonly [PlanePoint, PlanePoint, PlanePoint, PlanePoint];
  midpoint: PlanePoint;
  w: PlanePoint;
  /**
   * Where the bisector meets the imaginary axis, i|w|²/(2v).
   * Omitted when that point runs off the drawn window, which is the
   * near-vertical case (Im w tiny).
   */
  imagIntercept: PlanePoint | null;
};

export type RhoHalfLabel = {
  text: string;
  x: number;
  y: number;
  /** CSS-pixel offset from the projected point. Positive y is downward. */
  dx: number;
  dy: number;
  color: string;
};

/** Half-length of the drawn bisector, in world units. Long enough to cross a manual pan. */
const BISECTOR_HALF = 1e4;
/** Right-angle mark, as a fraction of |w|, matching the schematic's proportions. */
const SIDE_FRACTION = 0.08;
/** Past this |Im| the meeting point is no longer a useful mark on the diagram. */
const INTERCEPT_LIMIT = 1e4;
const LABEL = "#e6e8ee";
const INTERCEPT_LABEL = "#5aa7e6";

/**
 * Figure-4 diagram of Re ρ = 1/2 in the plane of ζ′/ζ, for one value of w.
 *
 * The level is the line through w/2 perpendicular to the segment from 0 to w.
 * The inputs are the real and imaginary parts of w(σ + i I(T)), so the
 * picture uses the true argument of w rather than the enlarged schematic angle.
 *
 * @param u - Real part of w
 * @param v - Imaginary part of w
 * @returns null when w is not a finite nonzero vector
 */
export function rhoHalfDiagram(u: number, v: number): RhoHalfDiagram | null {
  const abs = Math.hypot(u, v);
  if (!Number.isFinite(abs) || !(abs > 0)) return null;
  const mid: PlanePoint = { x: u / 2, y: v / 2 };
  const alongX = u / abs;
  const alongY = v / abs;
  const perpX = -v / abs;
  const perpY = u / abs;
  const side = SIDE_FRACTION * abs;
  let imagIntercept: PlanePoint | null = null;
  if (Math.abs(v) > 1e-8) {
    const y = (u * u + v * v) / (2 * v);
    if (Number.isFinite(y) && Math.abs(y) <= INTERCEPT_LIMIT) {
      imagIntercept = { x: 0, y };
    }
  }
  return {
    segment: [{ x: 0, y: 0 }, { x: u, y: v }],
    bisector: [
      { x: mid.x - BISECTOR_HALF * perpX, y: mid.y - BISECTOR_HALF * perpY },
      { x: mid.x + BISECTOR_HALF * perpX, y: mid.y + BISECTOR_HALF * perpY },
    ],
    rightAngle: [
      mid,
      { x: mid.x + side * alongX, y: mid.y + side * alongY },
      { x: mid.x + side * alongX + side * perpX, y: mid.y + side * alongY + side * perpY },
      { x: mid.x + side * perpX, y: mid.y + side * perpY },
    ],
    midpoint: mid,
    w: { x: u, y: v },
    imagIntercept,
  };
}

/**
 * Point of the bisector nearest to ζ′/ζ = α + iβ.
 *
 * The midpoint w/2 is the center of the segment and does not travel along
 * the line. This foot does: on σ = 1/2 the line is vertical and ζ′/ζ lies
 * on it, so the foot is ζ′/ζ itself, at height −Z′/Z.
 *
 * @param u - Real part of w
 * @param v - Imaginary part of w
 * @param alpha - Real part of ζ′/ζ
 * @param beta - Imaginary part of ζ′/ζ
 * @returns null when w vanishes or the sample is not finite
 */
export function bisectorFoot(u: number, v: number, alpha: number, beta: number): PlanePoint | null {
  const abs2 = u * u + v * v;
  if (!(abs2 > 0) || !Number.isFinite(abs2) || !Number.isFinite(alpha) || !Number.isFinite(beta)) {
    return null;
  }
  const t = ((alpha - u / 2) * (-v) + (beta - v / 2) * u) / abs2;
  return { x: u / 2 - t * v, y: v / 2 + t * u };
}

/**
 * Captions placed as in the schematic: 0, w, w/2, and the imaginary-axis meeting.
 */
export function rhoHalfLabels(diagram: RhoHalfDiagram): RhoHalfLabel[] {
  const labels: RhoHalfLabel[] = [
    { text: "0", x: 0, y: 0, dx: -12, dy: 12, color: LABEL },
    { text: wLabel(diagram.w.x, diagram.w.y), x: diagram.w.x, y: diagram.w.y, dx: 10, dy: -16, color: LABEL },
    { text: "w/2", x: diagram.midpoint.x, y: diagram.midpoint.y, dx: -28, dy: 14, color: LABEL },
  ];
  if (diagram.imagIntercept !== null) {
    labels.push({
      text: "i|w|²/(2v)",
      x: diagram.imagIntercept.x,
      y: diagram.imagIntercept.y,
      dx: 8,
      dy: 4,
      color: INTERCEPT_LABEL,
    });
  }
  return labels;
}

/**
 * Signed tilt of the segment 0→w off the negative real axis, in radians.
 * For T>1 the vector w points left, and this tilt is the small angle in
 * Figure 5: atan2(Im w, −Re w). It is 0 when w is real.
 */
function wLabel(u: number, v: number): string {
  const tilt = Math.atan2(v, -u);
  if (!Number.isFinite(tilt)) return "w";
  return `w  ${tilt.toFixed(8)}`;
}
