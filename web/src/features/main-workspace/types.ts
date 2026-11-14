import type { Point2 } from "@/shared/io/types";
import type { ZetaDrawMode } from "@/shared/math/zetaEms";

export type MainWorkspaceSerializableState = {
  /** Real part σ of s = σ + it */
  sigma: number;
  /** Fractional spiral index (maps to t via `indexToImag`) */
  index: number;
  /** When true, uses polynomial imaginary mapping (Unity `usingPolyImag`) */
  usePolyImag: boolean;
  /** Extra links beyond the default middle-index budget (Unity `extendSpiralCount`) */
  extendSpiralCount: number;
  drawMode: ZetaDrawMode;
  /** Open-circle marker at the origin (optional, default false) */
  showOrigin?: boolean;
  showZetaEndpoint: boolean;
  /** 0=Off, 1=R1ps, 2=R1ak, 3=R/2, 4=All (legacy bool true→1, false→0) */
  showBisectorPoint: number;
  /** Velocity-split point B₁* with its blue/yellow legs (optional, default false) */
  showB1Star?: boolean;
  /** Chords ζ′ → ζ and origin through M₂* (optional, default false) */
  showZetaPrimeToZeta?: boolean;
  /** Right-angle vertex B₁(1+cos ϑ₂) with legs origin → point → ζ (optional, default false) */
  showRightAngle?: boolean;
  /** Meeting-point polyline origin → M₁* → M₂* → ζ (optional, default false) */
  showMStar?: boolean;
  /** Argand point ρ = (ζ′/ζ)/(χ′/χ) (optional, default false) */
  showRho?: boolean;
  /** Argand point 1−ρ, equal to ρ(1−s) (optional, default false) */
  showOneMinusRho?: boolean;
  /** Argand point ζ′/ζ (optional, default false) */
  showZetaLogDeriv?: boolean;
  /** Argand point χ′/χ (optional, default false) */
  showChiLogDeriv?: boolean;
  /** Offset segment of B₁* whose critical-line length is h* (optional, default false) */
  showHStar?: boolean;
  /** Argand point G₀ of the AK saddle model (optional, default false) */
  showAkG0?: boolean;
  /** Argand point Q₀ (optional, default false) */
  showAkQ0?: boolean;
  /** Argand point Q₁ (optional, default false) */
  showAkQ1?: boolean;
  /** Argand point Q₂ (optional, default false) */
  showAkQ2?: boolean;
  /** Argand point Q₃, the next saddle after the three-saddle model (optional, default false) */
  showAkQ3?: boolean;
  /** Argand point Q₄ (optional, default false) */
  showAkQ4?: boolean;
  /** Argand point G₀ + Q₀ + Q₁ + Q₂ (optional, default false) */
  showAkSum?: boolean;
  /** 0=None, 1=Bisector, 2=Clock Arms, 3=Orbit */
  colorLinks: number;
  // Spiral matrix toggles
  spiralVisible: boolean;
  spiralFirstHalf?: boolean;
  /** Spiral-matrix f(s) row: forward spiral through the bisector joint plus R₁ak (optional, default false) */
  fOfSVisible?: boolean;
  spiralReflect: boolean;
  spiralHalfSigma: boolean;
  spiralReverse: boolean;
  inverseVisible: boolean;
  inverseFirstHalf?: boolean;
  inverseReflect: boolean;
  sumXVisible?: boolean;
  sumXReflect?: boolean;
  sum2xVisible?: boolean;
  sum2xReflect?: boolean;
  zakVisible: boolean;
  zakReflect: boolean;
  crossingSumVisible?: boolean;
  allRemaindersVisible?: boolean;
  etaVisible: boolean;
  zPrimeVisible: boolean;
  /** Z′ spiral inverted through the origin (optional, default false) */
  zPrimeReflect?: boolean;
  importedPoints?: Point2[];
  // Remainder layer toggles — all optional with default 0 / false for backward-compat
  rHalfPoint?: number;     rHalfR1?: number;     rHalfR2?: number;
  rHalfLegsFwd?: number;  rHalfLegsInv?: number; rHalfSym?: number;
  rHalfPathSigma?: number; rHalfPathIndex?: number;
  rpsPoint?: number;       rpsR1?: number;       rpsR2?: number;
  rpsLegsFwd?: number;    rpsLegsInv?: number;   rpsSym?: number;
  rpsPathSigma?: number;  rpsPathIndex?: number;
  rakPoint?: number;       rakR1?: number;       rakR2?: number;
  rakLegsFwd?: number;    rakLegsInv?: number;   rakSym?: number;
  rakPathSigma?: number;  rakPathIndex?: number;
  remainderPathLength?: number;
  // L-function layer — all optional for backward-compat
  lfL1Enabled?: boolean;   lfL2Enabled?: boolean;   lfFLEnabled?: boolean;
  lfTLEnabled?: boolean;
  lfL1Prime?: number;      lfL2Prime?: number;
  lfL1SpiralMode?: number; lfL2SpiralMode?: number; lfFLSpiralMode?: number;
  lfTLWhich?: number;      lfTLSpiralMode?: number;
  lfL1Reflect?: boolean;   lfL2Reflect?: boolean;   lfFLReflect?: boolean;
  lfTLReflect?: boolean;
  lfL1Bisector?: boolean;  lfL2Bisector?: boolean;  lfFLBisector?: boolean;
  lfTLBisector?: boolean;
  lfPhantomMode?: number;
  lfUsePrimeImag?: boolean;
  // General Hurwitz machine — optional, default off, χ = Titchmarsh L₁
  hmEnabled?: boolean;
  hmCoeffs?: { re: number; im: number }[];
  hmSpiralMode?: number;
  hmPhantomMode?: number;
  hmReflect?: boolean;
  hmBisector?: boolean;
  hmPerp?: boolean;
  hpRows?: { id: string; on: boolean }[];
  hpCircle?: boolean;
  hpShowSpiral?: boolean;
  hpShowReverse?: boolean;
  hpShowOH?: boolean;
  hpShowPerp?: boolean;
  hpShowBLink?: boolean;
  hpShowBPoint?: boolean;
  hpShowQ2Circle?: boolean;
  hpShowQ3Circle?: boolean;
  hpShowQ4Circle?: boolean;
  hpShowQ5Circle?: boolean;
  hpShowQ6Circle?: boolean;
  hpShowH?: boolean;
  hpShowB1Star?: boolean;
  hpQ2OmegaOn?: boolean;
  hpQ2OmegaDeg?: number;
  hpQ2OmegaLock?: boolean;
  hpOmegaOn?: boolean;
  hpOmegaDeg?: number;
  hpQ3OmegaLock?: boolean;
  hpQ4OmegaOn?: boolean;
  hpQ4OmegaDeg?: number;
  hpQ4OmegaLock?: boolean;
  hpQ5OmegaOn?: boolean;
  hpQ5OmegaDeg?: number;
  hpQ5OmegaLock?: boolean;
  hpQ6OmegaOn?: boolean;
  hpQ6OmegaDeg?: number;
  hpQ6OmegaLock?: boolean;
  hfQMax?: number;
  hfSingle?: boolean;
  hfShowSpiral?: boolean;
  hfShowReverse?: boolean;
  hfShowBLink?: boolean;
  hfShowBPoint?: boolean;
  hfShowOZ?: boolean;
  hfShowPerp?: boolean;
  hfShowCircle?: boolean;
  hfShowOH?: boolean;
};
