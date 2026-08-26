export type SpaceMode = "index" | "imaginary";

export type CriticalPoint = {
  real: number;
  index: number;
};

export type CriticalPointSet = {
  id: string;
  name: string;
  color: string;
  pointSize: number;
  skipCriticalLine: boolean;
  samplingInterval: number;
  /** When true, render consecutive points connected as a polyline instead of
   *  per-point markers. Wrap-detected (|Δx| > 0.5) segments are broken. */
  connectLines: boolean;
  /** When true, draw a thin horizontal line across the full strip width at
   *  each point's y (in addition to the point marker). Distinguishes sets
   *  that would otherwise overlap dot-for-dot. */
  hLine: boolean;
  points: CriticalPoint[];
};

export type ViewRange = {
  minY: number;
  maxY: number;
};

export type SigmaRange = 1 | 5 | 10;
