import { crossingScale, namedCrossingLink } from "@/features/links/linksChains";
import type { Point2 } from "@/shared/io/types";
import { chiBrian, rak } from "@/shared/math/zakCalculator";
import { indexToImag } from "@/shared/math/zetaEms";

/** The two ends of a crossing link, in the frame of the forward link it crosses. */
export type CrossingEnds = { yin: Point2; yang: Point2 };
/** Where the crossing sits along the link, against where T is inside the unit of the index. */
export type CrossingOffset = { at: number; offset: number | null };
/**
 * One forward link's crossing over a unit of the index: the two ends traced in its frame, a
 * piece per link that takes a turn crossing, and the crossing point's offset along the link.
 */
export type CrossingEndLoops = {
  yin: Point2[][];
  yang: Point2[][];
  offsets: CrossingOffset[];
  /** Reverse link of each yin/yang piece, in the same order. */
  held: number[];
};

/** Sampling stops a hair short of the handoff, where ⌊T⌋ and the frames would jump. */
const UNIT = 0.9999999;

/**
 * The yin and yang points of the bisector frame, already in link units:
 *
 *   Yin₁  = R·M^s,        Yang₁ = Yin₁ − χ·M^(2s−1),      M = ⌊T⌋+1.
 *
 * Dividing R by the bisector link M^(−s) is what puts these in link units, so in a strip
 * whose frame is the bisector link these are the drawing coordinates as they stand.
 */
export function yinYangInBisectorFrame(sigma: number, index: number, usePolyImag: boolean): { yin: Point2; yang: Point2 } {
  const M = Math.floor(index) + 1;
  const lnM = Math.log(M);
  const t = indexToImag(index, usePolyImag);

  const mPowRe = Math.pow(M, sigma) * Math.cos(t * lnM);
  const mPowIm = Math.pow(M, sigma) * Math.sin(t * lnM);
  const r = rak(sigma, index);
  const yin: Point2 = {
    x: r.re * mPowRe - r.im * mPowIm,
    y: r.re * mPowIm + r.im * mPowRe,
  };

  const m2Re = Math.pow(M, 2 * sigma - 1) * Math.cos(2 * t * lnM);
  const m2Im = Math.pow(M, 2 * sigma - 1) * Math.sin(2 * t * lnM);
  const chi = chiBrian({ re: sigma, im: t });
  return {
    yin,
    yang: {
      x: yin.x - (chi.re * m2Re - chi.im * m2Im),
      y: yin.y - (chi.re * m2Im + chi.im * m2Re),
    },
  };
}

/** Reads reverse joints in the frame of any forward link, at one T. */
export type LinkFrameSample = {
  /** The bisector link ⌊T⌋, whose crossing the mirror pins to the other chain's own. */
  bisector: number;
  /** The reverse link crossing forward link k. */
  link: (k: number) => number;
  /** Reverse joint j in the frame of forward link k, where that link runs 0 → 1 on the x-axis. */
  point: (k: number, j: number) => Point2;
  /** How far along the reverse chain this sample can read. */
  reach: number;
};

/** log n and the two radii n^(−σ), n^(σ−1) of the summands, none of which move with T. */
type WalkTables = { logs: Float64Array; fwd: Float64Array; rev: Float64Array };
let heldTables: WalkTables = { logs: new Float64Array(1), fwd: new Float64Array(1), rev: new Float64Array(1) };
let heldSigma = Number.NaN;

/**
 * The parts of a walk that stand still as T moves, kept between samples: a sweep of the unit
 * builds them once and every sample reads them off, which leaves the sine and cosine of each
 * summand's angle as the only work per link.
 */
function walkTables(sigma: number, far: number): WalkTables {
  if (sigma === heldSigma && heldTables.logs.length > far) return heldTables;
  const n = Math.max(far + 1, heldTables.logs.length);
  const logs = new Float64Array(n);
  const fwd = new Float64Array(n);
  const rev = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const ln = Math.log(i);
    logs[i] = ln;
    fwd[i] = Math.exp(-sigma * ln);
    rev[i] = Math.exp((sigma - 1) * ln);
  }
  heldSigma = sigma;
  heldTables = { logs, fwd, rev };
  return heldTables;
}

/**
 * One T's worth of the two chains, as partial sums that every link reads its own terms off.
 *
 * The reverse chain passes through Σ₁+R at its joint ⌊T⌋, and forward joint k is Σ₁ less the
 * summands between them, so reverse joint j seen from forward link k, before that link's own
 * (k+1)^(−s) is divided out, is
 *
 *   Σ_{n=k+1}^{⌊T⌋} n^(−s)  +  R  +  χ·Σ_{n=j+1}^{⌊T⌋} n^(s−1),
 *
 * the last sum running the other way, and negating, once j is past ⌊T⌋. Both sums are
 * differences of the two walks below, so drawing every strip costs one walk rather than one
 * per strip. At k = j = ⌊T⌋ this returns the yin point, and at j = ⌊T⌋+1 the yang point.
 *
 * The named crossing link is the product-law integer (k+1)(j+1) = t/2π, except at the
 * bisector, where the mirror pins the pair to the other chain's own link. The geometric
 * naming rule then steps to the lower neighbour when that named segment misses, the two
 * half-integer families of the product.
 */
export function linkFrameSample(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  reach: number,
): LinkFrameSample {
  const m = Math.floor(index);
  const t = indexToImag(index, usePolyImag);
  const chi = chiBrian({ re: sigma, im: t });
  const r = rak(sigma, index);
  const scale = crossingScale(index, usePolyImag);
  const far = Math.max(m + 1, Math.ceil(reach));
  const table = walkTables(sigma, far);

  const fwdRe = new Float64Array(m + 1);
  const fwdIm = new Float64Array(m + 1);
  for (let n = 1; n <= m; n++) {
    const angle = t * table.logs[n]!;
    const rad = table.fwd[n]!;
    fwdRe[n] = fwdRe[n - 1]! + rad * Math.cos(angle);
    fwdIm[n] = fwdIm[n - 1]! - rad * Math.sin(angle);
  }
  const revRe = new Float64Array(far + 1);
  const revIm = new Float64Array(far + 1);
  for (let n = 1; n <= far; n++) {
    const angle = t * table.logs[n]!;
    const rad = table.rev[n]!;
    revRe[n] = revRe[n - 1]! + rad * Math.cos(angle);
    revIm[n] = revIm[n - 1]! + rad * Math.sin(angle);
  }

  return {
    reach: far,
    bisector: m,
    link: (k: number): number => (k === m ? m : namedCrossingLink(scale, k)),
    point: (k: number, j: number): Point2 => {
      // One expression covers both sides of the bisector joint: the reverse sum changes sign
      // exactly as the difference of the walk does.
      const backRe = revRe[m]! - revRe[j]!;
      const backIm = revIm[m]! - revIm[j]!;
      const x = fwdRe[m]! - fwdRe[k]! + r.re + chi.re * backRe - chi.im * backIm;
      const y = fwdIm[m]! - fwdIm[k]! + r.im + chi.re * backIm + chi.im * backRe;
      // Dividing by the frame's link (k+1)^(−s) is multiplying by (k+1)^s.
      const rad = 1 / table.fwd[k + 1]!;
      const angle = t * table.logs[k + 1]!;
      const sx = rad * Math.cos(angle);
      const sy = rad * Math.sin(angle);
      return { x: x * sx - y * sy, y: x * sy + y * sx };
    },
  };
}

/**
 * How far along the reverse chain these forward links reach for their crossing links, held to
 * `maxLink` so a strip near link 0, whose crossing link sits out around (t/2π), cannot ask for
 * a longer walk than the chains themselves are drawn to.
 */
export function reverseReach(index: number, usePolyImag: boolean, links: number[], maxLink: number): number {
  const m = Math.floor(index);
  const scale = crossingScale(index, usePolyImag);
  let reach = m + 1;
  for (const k of links) reach = Math.max(reach, namedCrossingLink(scale, k) + 1);
  return Math.min(reach, Math.max(m + 1, maxLink));
}

/** The link crossing forward link k at one T, its two ends, and the crossing fraction. */
type CrossingPick = { link: number; ends: CrossingEnds; offset: number | null };

/**
 * The crossing of forward link k in one sample: the paper's rule that names the reverse link integer.
 * The bisector strip is pinned to its own link. Everywhere else the named integer is taken
 * when its ends straddle the forward link, and the lower neighbour when they do not — the
 * hyperbola's own half-integers, where rounding has already stepped past the geometric
 * crossing. The upper neighbour is never the miss.
 */
function crossingAt(sample: LinkFrameSample, k: number): CrossingPick | null {
  const pickAt = (j: number): CrossingPick | null => {
    if (j < 0 || j + 1 > sample.reach) return null;
    const ends = { yin: sample.point(k, j), yang: sample.point(k, j + 1) };
    const offset = crossingOffset(ends);
    const across = offset !== null && offset >= 0 && offset <= 1;
    return { link: j, ends, offset: across ? offset : null };
  };

  if (k === sample.bisector) return pickAt(k);

  const named = sample.link(k);
  const onNamed = pickAt(named);
  if (onNamed?.offset != null) return onNamed;
  return pickAt(named - 1) ?? onNamed;
}

/**
 * The offset a swept track has at a point of the unit of the index, straight between the
 * samples either side of it.
 */
export function offsetAt(track: CrossingEndLoops, at: number): number | null {
  const last = track.offsets.length - 1;
  if (last < 0) return null;
  const x = Math.min(last, Math.max(0, at * last));
  const i = Math.min(last - 1, Math.floor(x));
  const a = track.offsets[i]?.offset ?? null;
  const b = track.offsets[i + 1]?.offset ?? null;
  if (a === null) return b;
  if (b === null) return a;
  return a + (x - i) * (b - a);
}

/**
 * The two ends of the link crossing each of `links`, in each of their own frames.
 *
 * The link is the paper's rule that names the reverse link integer, so a reading at one T is the same
 * crossing a sweep of the unit would have drawn at that T, with no extra hint of where along
 * the link the last sample sat.
 */
export function crossingEndsForLinks(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  links: number[],
  maxLink: number,
): Map<number, CrossingEnds> {
  const sample = linkFrameSample(sigma, index, usePolyImag, reverseReach(index, usePolyImag, links, maxLink));
  const out = new Map<number, CrossingEnds>();
  for (const k of links) {
    const pick = crossingAt(sample, k);
    if (pick !== null) out.set(k, pick.ends);
  }
  return out;
}

/**
 * The crossing fraction: how far along the forward link its crossing sits, from the left
 * joint in link units, or null when the crossing link's ends do not straddle the forward
 * link at all.
 *
 * The frame puts the forward link on 0 → 1 of the x-axis, so this is where the chord from
 * the two ends meets that axis.
 */
export function crossingOffset(ends: CrossingEnds): number | null {
  const rise = ends.yin.y - ends.yang.y;
  if (rise === 0) return null;
  const u = ends.yin.y / rise;
  if (u < 0 || u > 1) return null;
  return ends.yin.x + u * (ends.yang.x - ends.yin.x);
}

/** The two ends of the link crossing forward link k, in that link's frame. */
export function crossingEnds(sigma: number, index: number, usePolyImag: boolean, k: number): CrossingEnds {
  const ends = crossingEndsForLinks(sigma, index, usePolyImag, [k], Number.MAX_SAFE_INTEGER).get(k);
  return ends ?? { yin: { x: 0, y: 0 }, yang: { x: 0, y: 0 } };
}

/**
 * The crossing of each of `links` followed over the unit of the index that holds T: the two
 * ends of the crossing link traced in that link's own frame, and where the crossing itself
 * sits along the link.
 *
 * At the bisector the crossing link is the bisector link the whole way and each end traces one
 * closed loop, the yin and yang curves. Anywhere else the crossing changes hands inside the
 * unit — one link is pulled across, then hands over to the next — so each end traces a piece
 * per link that takes a turn, and the pieces are kept apart rather than joined across the
 * handoff. The offsets carry straight through a handoff, since the two links share the joint
 * that is passing over the forward link at that moment.
 */
export function crossingSweep(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  links: number[],
  samples: number,
  maxLink: number,
): Map<number, CrossingEndLoops> {
  const m = Math.floor(index);
  // The links reach furthest at the top of the unit, so one walk that long serves every sample.
  const reach = reverseReach(m + UNIT, usePolyImag, links, maxLink);
  const out = new Map<number, CrossingEndLoops>();
  const held = new Map<number, number>();
  for (let i = 0; i <= samples; i++) {
    const at = i / samples;
    const sample = linkFrameSample(sigma, m + at * UNIT, usePolyImag, reach);
    for (const k of links) {
      const pick = crossingAt(sample, k);
      if (pick === null) continue;
      let loops = out.get(k);
      if (loops === undefined) {
        loops = { yin: [], yang: [], offsets: [], held: [] };
        out.set(k, loops);
      }
      if (held.get(k) !== pick.link) {
        loops.yin.push([]);
        loops.yang.push([]);
        loops.held.push(pick.link);
        held.set(k, pick.link);
      }
      loops.yin[loops.yin.length - 1]!.push(pick.ends.yin);
      loops.yang[loops.yang.length - 1]!.push(pick.ends.yang);
      loops.offsets.push({ at, offset: pick.offset });
    }
  }
  return out;
}

/** Coarsest a sweep may get once the walk is long, and finest it is ever worth taking. */
const MIN_SWEEP_SAMPLES = 12;
const MAX_SWEEP_SAMPLES = 256;
/**
 * How far out a strip's crossing link may lie, in bisector links, and still count as near.
 * Two is where the two ways of being wrong balance: any narrower and the strips just outside
 * the band, which still have a little shape, are left to the coarse rate; any wider and the
 * strips beside the bisector, which have all of it, lose their own rate to the walk.
 */
const FINE_REACH_FACTOR = 2;
/** The near strips' share of the budget, they being the ones with any shape to resolve. */
const NEAR_SHARE = 0.75;

/**
 * Every strip's crossing swept over the unit, at a rate set for the near strips and the far
 * ones separately, out of a shared allowance of `budget` chain steps.
 *
 * A strip's crossing link sits at a²/(k+1), so the walk a sample must take and the number of
 * times the crossing changes hands over the unit fall off together. The strips beside the
 * bisector hand over twice and carry the whole of the crossing's wander, on a walk barely past
 * the bisector; a strip near link 0 hands over hundreds of times, each a ripple far too small
 * to see, on a walk of thousands of links. One rate for the whole row has the near strips, the
 * ones with the shape, paying the far strips' bill, and at high T that leaves their fast
 * passages drawn as chords with the crossing itself well off them.
 */
export function budgetedCrossingSweep(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  links: number[],
  maxLink: number,
  budget: number,
): Map<number, CrossingEndLoops> {
  const m = Math.floor(index);
  const top = m + UNIT;
  const scale = crossingScale(top, usePolyImag);
  const limit = FINE_REACH_FACTOR * (m + 1);
  const near = links.filter(k => namedCrossingLink(scale, k) + 1 <= limit);
  const far = links.filter(k => namedCrossingLink(scale, k) + 1 > limit);
  const nearShare = far.length === 0 ? budget : budget * NEAR_SHARE;
  const farShare = near.length === 0 ? budget : budget * (1 - NEAR_SHARE);
  const out = new Map<number, CrossingEndLoops>();
  for (const [set, share] of [[near, nearShare], [far, farShare]] as const) {
    if (set.length === 0) continue;
    const reach = reverseReach(top, usePolyImag, set, maxLink);
    const samples = Math.max(
      MIN_SWEEP_SAMPLES,
      Math.min(MAX_SWEEP_SAMPLES, Math.floor(share / Math.max(1, reach))),
    );
    for (const [k, loops] of crossingSweep(sigma, index, usePolyImag, set, samples, maxLink)) {
      out.set(k, loops);
    }
  }
  return out;
}

/** The crossing of one forward link, followed over the unit of the index that holds T. */
export function crossingEndLoops(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  k: number,
  samples: number,
): CrossingEndLoops {
  const loops = crossingSweep(sigma, index, usePolyImag, [k], samples, Number.MAX_SAFE_INTEGER);
  return loops.get(k) ?? { yin: [], yang: [], offsets: [], held: [] };
}

/**
 * How far past the away end of a green or red piece the extension runs, in units of T.
 */
export const YIN_AWAY_EXTENT = 0.5;

type AwayWing = {
  k: number;
  p: number;
  j: number;
  from: number;
  to: number;
  down: boolean;
  end: "yin" | "yang";
  tip: Point2;
};

function hypot2(p: Point2): number {
  return p.x * p.x + p.y * p.y;
}

function addAwayWing(
  wings: AwayWing[],
  k: number,
  p: number,
  j: number,
  t0: number,
  t1: number,
  first: Point2,
  last: Point2,
  end: "yin" | "yang",
): void {
  // Yin leaves the end farther from the origin. Yang was landing on the inside of the red
  // piece with that same rule, so it takes the other end.
  const firstFarther = hypot2(first) > hypot2(last);
  const down = end === "yang" ? !firstFarther : firstFarther;
  const from = down ? Math.max(k + 1e-6, t0 - YIN_AWAY_EXTENT) : t1;
  const to = down ? t0 : t1 + YIN_AWAY_EXTENT;
  if (to <= from) return;
  wings.push({ k, p, j, from, to, down, end, tip: down ? first : last });
}

function wingPoints(loops: CrossingEndLoops, wing: AwayWing): Point2[] | undefined {
  return wing.end === "yin" ? loops.yin[wing.p] : loops.yang[wing.p];
}

/**
 * Yin and yang of every green/red piece, continued past one end of that piece.
 *
 * Each wing starts on the last sample of that piece so the join has no gap — a later T-grid
 * would miss that point. T then steps only away from the origin, below ⌊T⌋ or above ⌊T⌋+1.
 * The frame of link k exists only for T > k, so a downward wing stops there. The bisector
 * strip is left out: its teardrop already closes, and the same end test does not pick a side.
 */
export function yinAwaySweep(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  tracks: Map<number, CrossingEndLoops>,
  samples: number,
  maxLink: number,
): Map<number, CrossingEndLoops> {
  const m = Math.floor(index);
  const wings: AwayWing[] = [];
  const out = new Map<number, CrossingEndLoops>();
  let tLo = Infinity;
  let tHi = -Infinity;
  let reachNeed = m + 1;
  for (const [k, track] of tracks) {
    out.set(k, {
      yin: track.yin.map(() => []),
      yang: track.yang.map(() => []),
      offsets: [],
      held: [...track.held],
    });
    if (k === m) continue;
    let oi = 0;
    for (let p = 0; p < track.yin.length; p++) {
      const yin = track.yin[p]!;
      const yang = track.yang[p] ?? [];
      const j = track.held[p];
      const y0 = yin[0];
      const y1 = yin[yin.length - 1];
      if (j === undefined || y0 === undefined || y1 === undefined) {
        oi += yin.length;
        continue;
      }
      const t0 = m + (track.offsets[oi]?.at ?? 0) * UNIT;
      const t1 = m + (track.offsets[oi + yin.length - 1]?.at ?? 0) * UNIT;
      oi += yin.length;
      addAwayWing(wings, k, p, j, t0, t1, y0, y1, "yin");
      const a0 = yang[0];
      const a1 = yang[yang.length - 1];
      if (a0 !== undefined && a1 !== undefined) {
        addAwayWing(wings, k, p, j, t0, t1, a0, a1, "yang");
      }
      tLo = Math.min(tLo, t0 - YIN_AWAY_EXTENT, t1);
      tHi = Math.max(tHi, t1 + YIN_AWAY_EXTENT, t0);
      reachNeed = Math.max(reachNeed, j + 1);
    }
  }
  for (const wing of wings) {
    tLo = Math.min(tLo, wing.from);
    tHi = Math.max(tHi, wing.to);
  }
  if (wings.length === 0 || !Number.isFinite(tLo) || !Number.isFinite(tHi)) return out;
  const reach = Math.min(Math.max(reachNeed, Math.floor(tHi) + 1), Math.max(m + 1, maxLink));
  for (let i = 0; i <= samples; i++) {
    const T = tLo + ((tHi - tLo) * i) / samples;
    if (T < 1) continue;
    const sample = linkFrameSample(sigma, T, usePolyImag, reach);
    for (const wing of wings) {
      if (T < wing.from || T > wing.to) continue;
      // The tip is the green/red sample itself; skip the grid point that would sit on that T.
      if (wing.down ? T >= wing.to - 1e-12 : T <= wing.from + 1e-12) continue;
      const dest = out.get(wing.k);
      if (dest === undefined) continue;
      const pts = wingPoints(dest, wing);
      if (pts === undefined) continue;
      if (Math.floor(T) < wing.k || wing.j + 1 > sample.reach) continue;
      const joint = wing.end === "yin" ? wing.j : wing.j + 1;
      pts.push(sample.point(wing.k, joint));
    }
  }
  for (const wing of wings) {
    const dest = out.get(wing.k);
    if (dest === undefined) continue;
    const pts = wingPoints(dest, wing);
    if (pts === undefined) continue;
    if (wing.down) pts.reverse();
    pts.unshift(wing.tip);
  }
  return out;
}

/**
 * Yin and yang continuations of every green/red piece on forward link k, each leaving the
 * end farther from the strip origin.
 */
export function yinAwayLoops(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  k: number,
  samples: number,
): CrossingEndLoops {
  const track = crossingEndLoops(sigma, index, usePolyImag, k, samples);
  return yinAwaySweep(
    sigma,
    index,
    usePolyImag,
    new Map([[k, track]]),
    samples,
    Number.MAX_SAFE_INTEGER,
  ).get(k) ?? { yin: [], yang: [], offsets: [], held: [] };
}

/**
 * One loop each of the yin and yang curves in the bisector frame, traced over the unit of the
 * index that holds T, so they close as the bisector point hands off from one link to the next.
 */
export function yinYangLoops(
  sigma: number,
  index: number,
  usePolyImag: boolean,
  samples: number,
): { yin: Point2[]; yang: Point2[] } {
  const m = Math.floor(index);
  const yin: Point2[] = [];
  const yang: Point2[] = [];
  for (let i = 0; i <= samples; i++) {
    const v = yinYangInBisectorFrame(sigma, m + (i / samples) * UNIT, usePolyImag);
    yin.push(v.yin);
    yang.push(v.yang);
  }
  return { yin, yang };
}
