/**
 * Pair each zero with the zero at the same place on its twin curve.
 *
 * Zeros of f line up in curves spaced by ΔT ≈ 1. Those curves come in
 * pairs whose fractional parts differ by about 1/2. The noses (local
 * maxima of σ, the points that bulge farthest toward σ = 0) match, and
 * every other zero takes the same step-offset from its nose. A nose a
 * step or two farther can win when its σ profile matches more closely.
 * Each curve is then locked to one partner for its whole length, so the
 * next zero on a strand stays with the next zero on that same partner.
 * The pair
 * σ = −118.753352, T = 780.456645 and σ = −111.663710, T = 769.967040
 * is one such nose pair.
 */

const LINK_DSIG = 3;
const LINK_DFRAC = 0.008;
const NOSE_HALF = 12;
const NOSE_MIN_OVERLAP = 16;
const NOSE_RMS_MAX = 0.6;
const NOSE_T_WINDOW = 120;
const NOSE_FRAC_TOL = 0.03;
const MAX_NOSE_STEPS = 80;
/** A nose one step farther has to match the σ profile better by this much to win. */
const NOSE_STEP_PENALTY = 0.05;

function fracPart(t: number): number {
  return t - Math.floor(t);
}

function wrapFracDelta(tA: number, tB: number): number {
  let d = fracPart(tB) - fracPart(tA);
  d -= Math.floor(d);
  if (d < 0) d += 1;
  return d;
}

/**
 * Index of each zero's twin, or −1 when this zero has no partner.
 * `twin[twin[i]] === i` for every paired zero.
 */
export function pairZeroTwins(
  sigma: ArrayLike<number>,
  t: ArrayLike<number>,
): Int32Array {
  return buildStrandIndex(sigma, t).twin;
}

/** Twin index plus the previous and next zero on each strand. */
export type StrandIndex = {
  twin: Int32Array;
  /** Strand neighbor with smaller T, or −1. */
  before: Int32Array;
  /** Strand neighbor with larger T, or −1. */
  after: Int32Array;
};

/**
 * Build twin pairs and the one-step strand links those pairs walk.
 * A strand step is the mutual neighbor about ΔT = 1 that is also close
 * in σ and in {T}.
 */
export function indexStrands(
  sigma: ArrayLike<number>,
  t: ArrayLike<number>,
): StrandIndex {
  return buildStrandIndex(sigma, t);
}

function buildStrandIndex(
  sigma: ArrayLike<number>,
  t: ArrayLike<number>,
): StrandIndex {
  const n = sigma.length;
  const twin = new Int32Array(n);
  twin.fill(-1);
  if (t.length !== n || n === 0) {
    const before = new Int32Array(n);
    const after = new Int32Array(n);
    before.fill(-1);
    after.fill(-1);
    return { twin, before, after };
  }

  const bins = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const key = Math.floor(t[i]!);
    const bucket = bins.get(key);
    if (bucket === undefined) bins.set(key, [i]);
    else bucket.push(i);
  }

  const succ = new Int32Array(n);
  const pred = new Int32Array(n);
  succ.fill(-1);
  pred.fill(-1);

  const neighbor = (i: number, direction: number): number => {
    const t0 = t[i]!;
    const s0 = sigma[i]!;
    const f0 = fracPart(t0);
    let best = -1;
    let bestScore = Infinity;
    const ti = Math.floor(t0);
    for (let b = ti + direction - 1; b <= ti + direction + 1; b++) {
      const bucket = bins.get(b);
      if (bucket === undefined) continue;
      for (let k = 0; k < bucket.length; k++) {
        const j = bucket[k]!;
        const dt = t[j]! - t0;
        if (direction > 0 && (dt <= 0.6 || dt >= 1.4)) continue;
        if (direction < 0 && (dt >= -0.6 || dt <= -1.4)) continue;
        const ds = sigma[j]! - s0;
        let df = fracPart(t[j]!) - f0;
        if (df > 0.5) df -= 1;
        if (df < -0.5) df += 1;
        if (Math.abs(ds) > LINK_DSIG || Math.abs(df) > LINK_DFRAC) continue;
        const score = (ds / LINK_DSIG) ** 2 + (df / LINK_DFRAC) ** 2;
        if (score < bestScore) {
          bestScore = score;
          best = j;
        }
      }
    }
    return best;
  };

  for (let i = 0; i < n; i++) {
    const next = neighbor(i, 1);
    if (next >= 0 && neighbor(next, -1) === i) {
      succ[i] = next;
      pred[next] = i;
    }
  }

  const noses: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pred[i]!;
    const b = succ[i]!;
    if (a < 0 || b < 0) continue;
    const aa = pred[a]!;
    const bb = succ[b]!;
    if (aa < 0 || bb < 0) continue;
    const s = sigma[i]!;
    if (s >= sigma[a]! && s >= sigma[b]! && s > sigma[aa]! && s > sigma[bb]!) {
      noses.push(i);
    }
  }

  const profileOf = (nose: number): Float64Array => {
    const profile = new Float64Array(NOSE_HALF * 2 + 1);
    profile.fill(Number.NaN);
    profile[NOSE_HALF] = sigma[nose]!;
    let i = nose;
    for (let step = 1; step <= NOSE_HALF; step++) {
      i = pred[i]!;
      if (i < 0) break;
      profile[NOSE_HALF - step] = sigma[i]!;
    }
    i = nose;
    for (let step = 1; step <= NOSE_HALF; step++) {
      i = succ[i]!;
      if (i < 0) break;
      profile[NOSE_HALF + step] = sigma[i]!;
    }
    return profile;
  };

  const profiles = new Map<number, Float64Array>();
  const byFrac = new Map<number, number[]>();
  for (let k = 0; k < noses.length; k++) {
    const nose = noses[k]!;
    profiles.set(nose, profileOf(nose));
    const bin = Math.floor(fracPart(t[nose]!) * 100);
    const bucket = byFrac.get(bin);
    if (bucket === undefined) byFrac.set(bin, [nose]);
    else bucket.push(nose);
  }

  const rms = (a: number, b: number): number => {
    const pa = profiles.get(a);
    const pb = profiles.get(b);
    if (pa === undefined || pb === undefined) return Infinity;
    let count = 0;
    let sum = 0;
    let sumSq = 0;
    for (let k = 0; k < pa.length; k++) {
      const da = pa[k]!;
      const db = pb[k]!;
      if (!Number.isFinite(da) || !Number.isFinite(db)) continue;
      const d = db - da;
      sum += d;
      sumSq += d * d;
      count += 1;
    }
    if (count < NOSE_MIN_OVERLAP) return Infinity;
    const mean = sum / count;
    return Math.sqrt(sumSq / count - mean * mean);
  };

  const bestNose = new Int32Array(n);
  const bestRms = new Float64Array(n);
  bestNose.fill(-1);
  bestRms.fill(Infinity);

  for (let k = 0; k < noses.length; k++) {
    const nose = noses[k]!;
    const partnerFrac = fracPart(t[nose]!) + 0.5;
    const lo = Math.floor((partnerFrac - NOSE_FRAC_TOL) * 100);
    const hi = Math.floor((partnerFrac + NOSE_FRAC_TOL) * 100);
    let winner = -1;
    let winnerRms = Infinity;
    for (let bin = lo; bin <= hi; bin++) {
      const bucket = byFrac.get((bin % 100 + 100) % 100);
      if (bucket === undefined) continue;
      for (let c = 0; c < bucket.length; c++) {
        const other = bucket[c]!;
        if (other === nose) continue;
        if (Math.abs(t[other]! - t[nose]!) > NOSE_T_WINDOW) continue;
        const sep = wrapFracDelta(t[nose]!, t[other]!);
        if (Math.abs(sep - 0.5) > NOSE_FRAC_TOL) continue;
        const score = rms(nose, other);
        if (score < winnerRms) {
          winnerRms = score;
          winner = other;
        }
      }
    }
    if (winner >= 0 && winnerRms <= NOSE_RMS_MAX) {
      bestNose[nose] = winner;
      bestRms[nose] = winnerRms;
    }
  }

  const noseTwin = new Int32Array(n);
  noseTwin.fill(-1);
  for (let k = 0; k < noses.length; k++) {
    const nose = noses[k]!;
    const other = bestNose[nose]!;
    if (other >= 0 && bestNose[other] === nose) noseTwin[nose] = other;
  }

  const shift = (start: number, steps: number): number => {
    let i = start;
    const toward = steps >= 0 ? succ : pred;
    const count = Math.abs(steps);
    for (let s = 0; s < count; s++) {
      const next = toward[i]!;
      if (next < 0) return -1;
      i = next;
    }
    return i;
  };

  for (let i = 0; i < n; i++) {
    let chosen = -1;
    let steps = 0;
    let chosenScore = Infinity;
    let left = i;
    let right = i;
    for (let s = 0; s <= MAX_NOSE_STEPS; s++) {
      if (s > 0) {
        if (left >= 0) left = pred[left]!;
        if (right >= 0) right = succ[right]!;
      }
      const consider = (nose: number, noseSteps: number, dist: number): void => {
        if (nose < 0 || noseTwin[nose]! < 0) return;
        const score = bestRms[nose]! + NOSE_STEP_PENALTY * dist;
        if (score < chosenScore) {
          chosen = nose;
          steps = noseSteps;
          chosenScore = score;
        }
      };
      if (s === 0) consider(i, 0, 0);
      else {
        consider(left, s, s);
        consider(right, -s, s);
      }
    }
    if (chosen < 0) continue;
    const landed = shift(noseTwin[chosen]!, steps);
    if (landed >= 0 && landed !== i) twin[i] = landed;
  }

  const rawTwin = new Int32Array(twin);
  for (let i = 0; i < n; i++) {
    const j = twin[i]!;
    if (j >= 0 && twin[j] !== i) twin[i] = -1;
  }

  // Two curves can both claim the same neighbor. Keep the alignment that
  // already agrees on the most points, then pair every overlapping zero
  // at that fixed offset. A later curve cannot take one point and leave
  // the next one blank.
  const strandOf = new Int32Array(n);
  const posOf = new Int32Array(n);
  strandOf.fill(-1);
  const strandPoints: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (pred[i]! >= 0) continue;
    const id = strandPoints.length;
    const pts: number[] = [];
    for (let k = i; k >= 0; k = succ[k]!) {
      if (strandOf[k]! >= 0) break;
      strandOf[k] = id;
      posOf[k] = pts.length;
      pts.push(k);
    }
    strandPoints.push(pts);
  }

  type Align = { a: number; b: number; offset: number; mutual: number; raw: number };
  const aligns = new Map<string, Align>();
  const vote = (i: number, j: number, mutual: boolean): void => {
    const sa = strandOf[i]!;
    const sb = strandOf[j]!;
    if (sa < 0 || sb < 0 || sa === sb) return;
    const a = sa < sb ? sa : sb;
    const b = sa < sb ? sb : sa;
    const offset = sa < sb ? posOf[j]! - posOf[i]! : posOf[i]! - posOf[j]!;
    const key = `${a}:${b}:${offset}`;
    let row = aligns.get(key);
    if (row === undefined) {
      row = { a, b, offset, mutual: 0, raw: 0 };
      aligns.set(key, row);
    }
    if (mutual) row.mutual += 1;
    else row.raw += 1;
  };
  for (let i = 0; i < n; i++) {
    const j = twin[i]!;
    if (j > i && twin[j] === i) vote(i, j, true);
    const aimed = rawTwin[i]!;
    if (aimed >= 0 && aimed !== i) vote(i, aimed, false);
  }

  const ranked = [...aligns.values()].sort(
    (p, q) => q.mutual - p.mutual || q.raw - p.raw || p.a - q.a || p.offset - q.offset,
  );
  twin.fill(-1);
  const taken = new Uint8Array(strandPoints.length);
  for (const row of ranked) {
    if (row.mutual < 1) continue;
    if (taken[row.a] === 1 || taken[row.b] === 1) continue;
    taken[row.a] = 1;
    taken[row.b] = 1;
    const left = strandPoints[row.a]!;
    const right = strandPoints[row.b]!;
    for (let p = 0; p < left.length; p++) {
      const q = p + row.offset;
      if (q < 0 || q >= right.length) continue;
      const ia = left[p]!;
      const ib = right[q]!;
      twin[ia] = ib;
      twin[ib] = ia;
    }
  }
  return { twin, before: pred, after: succ };
}
