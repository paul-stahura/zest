import { fracTThousandthsBin } from "@/shared/math/zerosOfF/fracTDisplayFilter";
import rawJson from "@/shared/math/zerosOfF/fracTClosedBoundary.json";

export type FracTFourierSpike = {
  theta0: number;
  width: number;
  reversed: boolean;
};

export type FracTFourierSeries = {
  c0: number;
  cos: readonly number[];
  sin: readonly number[];
  spikes: readonly number[];
};

export type FracTFourierBoundaryFit = {
  harmonics: number;
  spikes: readonly FracTFourierSpike[];
  L: FracTFourierSeries;
  P: FracTFourierSeries;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFiniteNumbers(value: unknown, count: number, label: string): number[] {
  if (!Array.isArray(value) || value.length !== count) {
    throw new Error(`frac-T Fourier ${label} must have ${String(count)} numbers`);
  }
  const out: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`frac-T Fourier ${label} is not a finite number list`);
    }
    out.push(item);
  }
  return out;
}

function readSeries(value: unknown, harmonics: number, spikeCount: number, label: string): FracTFourierSeries {
  if (!isRecord(value) || typeof value.c0 !== "number" || !Number.isFinite(value.c0)) {
    throw new Error(`frac-T Fourier ${label} is missing c0`);
  }
  return {
    c0: value.c0,
    cos: readFiniteNumbers(value.cos, harmonics, `${label}.cos`),
    sin: readFiniteNumbers(value.sin, harmonics, `${label}.sin`),
    spikes: readFiniteNumbers(value.spikes, spikeCount, `${label}.spikes`),
  };
}

function readSpikes(value: unknown): FracTFourierSpike[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("frac-T Fourier spikes are missing");
  }
  const spikes: FracTFourierSpike[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      throw new Error("frac-T Fourier spike is not an object");
    }
    const theta0 = item.theta0;
    const width = item.width;
    const reversed = item.reversed;
    if (typeof theta0 !== "number" || typeof width !== "number" || typeof reversed !== "boolean") {
      throw new Error("frac-T Fourier spike is missing theta0/width/reversed");
    }
    if (!Number.isFinite(theta0) || !(width > 0)) {
      throw new Error("frac-T Fourier spike has invalid theta0/width");
    }
    spikes.push({ theta0, width, reversed });
  }
  return spikes;
}

/**
 * Load the pre-identity envelope fit: 10 Fourier harmonics plus eight
 * exponential spikes on L(θ) and P(θ). The JSON is a fit artifact, not
 * the later closed-form identity.
 */
export function parseFracTFourierBoundaryFit(data: unknown): FracTFourierBoundaryFit {
  if (!isRecord(data) || typeof data.harmonics !== "number" || !Number.isInteger(data.harmonics)) {
    throw new Error("frac-T Fourier fit is missing harmonics");
  }
  const harmonics = data.harmonics;
  if (harmonics < 1) {
    throw new Error("frac-T Fourier harmonics must be positive");
  }
  const spikes = readSpikes(data.spikes);
  return {
    harmonics,
    spikes,
    L: readSeries(data.L, harmonics, spikes.length, "L"),
    P: readSeries(data.P, harmonics, spikes.length, "P"),
  };
}

export const FRAC_T_FOURIER_BOUNDARY = parseFracTFourierBoundaryFit(rawJson);

/** Python/NumPy `x % 1` for real x (always in [0, 1)). */
function unitIntervalMod(value: number): number {
  return ((value % 1) + 1) % 1;
}

/**
 * Evaluate one of the two Fourier+spike series at a thousandth θ.
 * Spikes sit at the harvest onsets ~0.213 and ~0.713 so the trig part
 * does not have to ring through the quarter poles.
 */
export function evalFracTFourierSeries(
  theta: number,
  series: FracTFourierSeries,
  spikes: readonly FracTFourierSpike[],
): number {
  let sum = series.c0;
  for (let m = 1; m <= series.cos.length; m++) {
    const angle = 2 * Math.PI * m * theta;
    sum += (series.cos[m - 1] ?? 0) * Math.cos(angle);
    sum += (series.sin[m - 1] ?? 0) * Math.sin(angle);
  }
  for (let i = 0; i < spikes.length; i++) {
    const term = spikes[i];
    const amplitude = series.spikes[i];
    if (term === undefined || amplitude === undefined) continue;
    const raw = term.reversed ? term.theta0 - theta : theta - term.theta0;
    sum += amplitude * Math.exp(-unitIntervalMod(raw) / term.width);
  }
  return sum;
}

export function fracTFourierBoundaryLP(justOne: number): { L: number; P: number } {
  const theta = fracTThousandthsBin(justOne) / 1000;
  return {
    L: evalFracTFourierSeries(theta, FRAC_T_FOURIER_BOUNDARY.L, FRAC_T_FOURIER_BOUNDARY.spikes),
    P: evalFracTFourierSeries(theta, FRAC_T_FOURIER_BOUNDARY.P, FRAC_T_FOURIER_BOUNDARY.spikes),
  };
}

/**
 * Pre-identity log-log envelope: ln T = L(θ) + P(θ) ln|σ|.
 * Returns NaN at σ=0 so the polyline skips the log singularity.
 */
export function fracTFourierBoundaryT(sigma: number, justOne: number): number {
  const absSigma = Math.abs(sigma);
  if (!(absSigma > 0)) return Number.NaN;
  const { L, P } = fracTFourierBoundaryLP(justOne);
  return Math.exp(L + P * Math.log(absSigma));
}

export function fracTFourierBoundaryLabel(justOne: number): string {
  const frac = (fracTThousandthsBin(justOne) / 1000).toFixed(3);
  return `${frac}: Fourier (10 harm.) T=e^{L} |σ|^{P}`;
}
