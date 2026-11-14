import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import packedOverlayRowCountsJson from "@/features/zeros-of-f/overlay-row-counts.json";
import {
  HUNT4_SLICE_ID,
  HUNT5_SLICE_ID,
  type HarvestSliceId,
  type HarvestTBandId,
  type OverlayHarvestSliceId,
} from "@/shared/math/zerosOfF/harvestTBands";

export const OVERLAY_ROW_IDS = [
  "akSigmaLtNeg50",
  "akSigmaGtNeg50",
  "t3975To4000_sigmaLt0",
  "t3975To4000_sigma0To1",
  "t3950To3975_sigmaLt0",
  "t3950To3975_sigma0To1",
  "t3925To3950_sigmaLt0",
  "t3925To3950_sigma0To1",
  "t3900To3925_sigmaLt0",
  "t3900To3925_sigma0To1",
  HUNT4_SLICE_ID,
  HUNT5_SLICE_ID,
] as const;

export type OverlayRowId = (typeof OVERLAY_ROW_IDS)[number];

export type OverlayRowCounts = Record<OverlayRowId, number>;

export const EMPTY_OVERLAY_ROW_COUNTS: OverlayRowCounts = {
  akSigmaLtNeg50: 0,
  akSigmaGtNeg50: 0,
  t3975To4000_sigmaLt0: 0,
  t3975To4000_sigma0To1: 0,
  t3950To3975_sigmaLt0: 0,
  t3950To3975_sigma0To1: 0,
  t3925To3950_sigmaLt0: 0,
  t3925To3950_sigma0To1: 0,
  t3900To3925_sigmaLt0: 0,
  t3900To3925_sigma0To1: 0,
  t398To3900_sigmaNeg50ToNeg10: 0,
  t398To3900_sigmaNeg20To0: 0,
};

export type OverlayAkRow = {
  kind: "ak";
  id: "akSigmaLtNeg50" | "akSigmaGtNeg50";
  label: string;
};

export type OverlayTRow = {
  kind: "tBand";
  bandId: HarvestTBandId;
  label: string;
  sigmaLt0Id: HarvestSliceId;
  sigma0To1Id: HarvestSliceId;
};

export type OverlayWindowRow = {
  kind: "window";
  id: typeof HUNT4_SLICE_ID | typeof HUNT5_SLICE_ID;
  label: string;
};

/** Hunt windows under the T-band grid, then the two AK rows. */
export const OVERLAY_WINDOW_ROWS: readonly OverlayWindowRow[] = [
  {
    kind: "window",
    id: HUNT4_SLICE_ID,
    label: "T=398.44 to 3900, σ=-50 to -10",
  },
  {
    kind: "window",
    id: HUNT5_SLICE_ID,
    label: "T=398.44 to 3900, σ=-20 to 0",
  },
];

/** T-bands first (highest T on top), then the two AK rows. */
export const OVERLAY_AK_ROWS: readonly OverlayAkRow[] = [
  { kind: "ak", id: "akSigmaLtNeg50", label: "AK's zeros to t=1M, sigma<-50" },
  { kind: "ak", id: "akSigmaGtNeg50", label: "AK's zeros to t=1M, sigma>-50" },
];

/**
 * Later AK catalogs of zeros of f(s). Source files are (σ, t) with t = Im s.
 * Each row is that list at index T = I⁻¹(t). Highest T on top.
 * Endpoints are the data min and max, rounded to the half-integer they sit on.
 */
function akFsZerosLabel(tMin: number, tMax: number): string {
  return `AK zeros T=${String(tMin)} to ${String(tMax)}`;
}

export const AK_FS_ZERO_ROWS = [
  {
    flag: "showAkFsZerosT300k",
    tMin: 299999.5,
    tMax: 319998.5,
    label: akFsZerosLabel(299999.5, 319998.5),
    count: 297199,
    url: `${import.meta.env.BASE_URL}zeros-of-f/ak-fs-zeros-t300000-320000.bin`,
  },
  {
    flag: "showAkFsZerosT100k",
    tMin: 99999.5,
    tMax: 110000.5,
    label: akFsZerosLabel(99999.5, 110000.5),
    count: 140441,
    url: `${import.meta.env.BASE_URL}zeros-of-f/ak-fs-zeros-t100000-110000.bin`,
  },
  {
    flag: "showAkFsZerosT20k",
    tMin: 19999.5,
    tMax: 25000.5,
    label: akFsZerosLabel(19999.5, 25000.5),
    count: 169162,
    url: `${import.meta.env.BASE_URL}zeros-of-f/ak-fs-zeros-t20000-25000.bin`,
  },
] as const;

export type AkFsZeroFlag = (typeof AK_FS_ZERO_ROWS)[number]["flag"];

/**
 * Patch that flips one later-AK catalog checkbox.
 */
export function akFsZeroPatch(flag: AkFsZeroFlag, on: boolean): Partial<DisplayControlsState> {
  switch (flag) {
    case "showAkFsZerosT20k":
      return { showAkFsZerosT20k: on };
    case "showAkFsZerosT100k":
      return { showAkFsZerosT100k: on };
    case "showAkFsZerosT300k":
      return { showAkFsZerosT300k: on };
    default: {
      const _never: never = flag;
      return _never;
    }
  }
}

export const OVERLAY_T_ROWS: readonly OverlayTRow[] = [
  {
    kind: "tBand",
    bandId: "t3975To4000",
    label: "T=3975 to 4000",
    sigmaLt0Id: "t3975To4000_sigmaLt0",
    sigma0To1Id: "t3975To4000_sigma0To1",
  },
  {
    kind: "tBand",
    bandId: "t3950To3975",
    label: "T=3950 to 3975",
    sigmaLt0Id: "t3950To3975_sigmaLt0",
    sigma0To1Id: "t3950To3975_sigma0To1",
  },
  {
    kind: "tBand",
    bandId: "t3925To3950",
    label: "T=3925 to 3950",
    sigmaLt0Id: "t3925To3950_sigmaLt0",
    sigma0To1Id: "t3925To3950_sigma0To1",
  },
  {
    kind: "tBand",
    bandId: "t3900To3925",
    label: "T=3900 to 3925",
    sigmaLt0Id: "t3900To3925_sigmaLt0",
    sigma0To1Id: "t3900To3925_sigma0To1",
  },
];

/**
 * Which overlay checkbox is on.
 */
export function overlayRowChecked(display: DisplayControlsState, id: OverlayRowId): boolean {
  switch (id) {
    case "akSigmaLtNeg50":
      return display.showAkZerosSigmaLtNeg50;
    case "akSigmaGtNeg50":
      return display.showAkZerosSigmaGtNeg50;
    case "t3975To4000_sigmaLt0":
      return display.showT3975To4000SigmaLt0;
    case "t3975To4000_sigma0To1":
      return display.showT3975To4000Sigma0To1;
    case "t3950To3975_sigmaLt0":
      return display.showT3950To3975SigmaLt0;
    case "t3950To3975_sigma0To1":
      return display.showT3950To3975Sigma0To1;
    case "t3925To3950_sigmaLt0":
      return display.showT3925To3950SigmaLt0;
    case "t3925To3950_sigma0To1":
      return display.showT3925To3950Sigma0To1;
    case "t3900To3925_sigmaLt0":
      return display.showT3900To3925SigmaLt0;
    case "t3900To3925_sigma0To1":
      return display.showT3900To3925Sigma0To1;
    case "t398To3900_sigmaNeg50ToNeg10":
      return display.showT398To3900SigmaNeg50ToNeg10;
    case "t398To3900_sigmaNeg20To0":
      return display.showT398To3900SigmaNeg20To0;
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

/**
 * Patch that flips one accordion checkbox without touching the others.
 */
export function overlayRowPatch(id: OverlayRowId, on: boolean): Partial<DisplayControlsState> {
  switch (id) {
    case "akSigmaLtNeg50":
      return { showAkZerosSigmaLtNeg50: on };
    case "akSigmaGtNeg50":
      return { showAkZerosSigmaGtNeg50: on };
    case "t3975To4000_sigmaLt0":
      return { showT3975To4000SigmaLt0: on };
    case "t3975To4000_sigma0To1":
      return { showT3975To4000Sigma0To1: on };
    case "t3950To3975_sigmaLt0":
      return { showT3950To3975SigmaLt0: on };
    case "t3950To3975_sigma0To1":
      return { showT3950To3975Sigma0To1: on };
    case "t3925To3950_sigmaLt0":
      return { showT3925To3950SigmaLt0: on };
    case "t3925To3950_sigma0To1":
      return { showT3925To3950Sigma0To1: on };
    case "t3900To3925_sigmaLt0":
      return { showT3900To3925SigmaLt0: on };
    case "t3900To3925_sigma0To1":
      return { showT3900To3925Sigma0To1: on };
    case "t398To3900_sigmaNeg50ToNeg10":
      return { showT398To3900SigmaNeg50ToNeg10: on };
    case "t398To3900_sigmaNeg20To0":
      return { showT398To3900SigmaNeg20To0: on };
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

/**
 * Whether a Hunt-3 T×σ overlay slice is checked.
 */
export function harvestSliceShown(
  display: DisplayControlsState,
  id: OverlayHarvestSliceId,
): boolean {
  return overlayRowChecked(display, id);
}

/**
 * Read overlay counts from the packed JSON. Missing or bad fields become 0.
 */
export function parseOverlayRowCounts(data: unknown): OverlayRowCounts {
  const counts = { ...EMPTY_OVERLAY_ROW_COUNTS };
  if (typeof data !== "object" || data === null) return counts;
  for (const id of OVERLAY_ROW_IDS) {
    const value = Reflect.get(data, id);
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      counts[id] = Math.floor(value);
    }
  }
  return counts;
}

/**
 * Counts from the last packed harvest. Bundled so the accordion does not
 * wait on a `${import.meta.env.BASE_URL}zeros-of-f/*.json` fetch that the SPA route can swallow.
 */
export const PACKED_OVERLAY_ROW_COUNTS = parseOverlayRowCounts(packedOverlayRowCountsJson);

/**
 * Zeros in `committed-scan.bin`: T up to 4000 and σ < −50.
 * That file also holds the former σ ∈ [−500, −400] strip, without its five
 * points at T < 8, plus 128 zeros with σ < −500 found for T about 3872 to 4000.
 */
export const MAIN_ZEROS_LABEL = "main zeros: T up to 4000 sigma<-50";

/** Header count of `committed-scan.bin`. */
export const MAIN_ZEROS_COUNT = 204243;

/**
 * f_N zeros from the fast locator: T from 4000 to 13000, above
 * T = 0.173·|σ|^1.61 − 100, σ from −200 out to that curve.
 */
export const ABOVE_CURVE_LABEL = "AK locator: T 4000 to 13000, above 0.173·|σ|^1.61−100";

/** Header count of `ak-above-curve-t4000-13000.bin`. */
export const ABOVE_CURVE_COUNT = 814974;

/**
 * The certified catalog shares the live scatter with scans and other harvests.
 * Hide that layer only while it still holds the catalog and its checkbox is off.
 */
export function mainZerosLayerVisible(
  holdsCatalog: boolean,
  siegelHarvest: boolean,
  checked: boolean,
): boolean {
  if (!holdsCatalog || !siegelHarvest) return true;
  return checked;
}

/** Zeros in `r1ak-s1t55.bin` (σ near −1 to 1, T to 55), from its header. */
export const R1AK_NEAR_STRIP_COUNT = 10063;

/**
 * Zeros in `r1ak-strip-t55-100.bin` (25 923) plus `r1ak-strip-t100-300.bin`
 * (375 208), from their headers.
 */
export const R1AK_STRIP_TO_300_COUNT = 401131;
