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
  showZetaEndpoint: boolean;
  /** 0=Off, 1=R1ps, 2=R1ak, 3=R/2, 4=All (legacy bool true→1, false→0) */
  showBisectorPoint: number;
  /** 0=None, 1=Bisector, 2=Clock Arms, 3=Orbit */
  colorLinks: number;
  // Spiral matrix toggles
  spiralVisible: boolean;
  spiralFirstHalf?: boolean;
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
  etaVisible: boolean;
  zPrimeVisible: boolean;
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
  lfL1Enabled?: boolean;   lfL2Enabled?: boolean;
  lfL1Prime?: number;      lfL2Prime?: number;
  lfL1SpiralMode?: number; lfL2SpiralMode?: number;
  lfL1Reflect?: boolean;   lfL2Reflect?: boolean;
  lfL1Bisector?: boolean;  lfL2Bisector?: boolean;
  lfPhantomMode?: number;
  lfUsePrimeImag?: boolean;
};
