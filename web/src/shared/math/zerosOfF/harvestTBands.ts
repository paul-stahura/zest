/** Hunt-3 index-T overlays. Highest T first. Top band is closed on T=4000. */

export const HARVEST_T_BAND_IDS = [
  "t3975To4000",
  "t3950To3975",
  "t3925To3950",
  "t3900To3925",
] as const;

export type HarvestTBandId = (typeof HARVEST_T_BAND_IDS)[number];

export const HARVEST_SIGMA_SPLITS = ["sigmaLt0", "sigma0To1"] as const;

export type HarvestSigmaSplit = (typeof HARVEST_SIGMA_SPLITS)[number];

export const HARVEST_SLICE_IDS = [
  "t3975To4000_sigmaLt0",
  "t3975To4000_sigma0To1",
  "t3950To3975_sigmaLt0",
  "t3950To3975_sigma0To1",
  "t3925To3950_sigmaLt0",
  "t3925To3950_sigma0To1",
  "t3900To3925_sigmaLt0",
  "t3900To3925_sigma0To1",
] as const;

export type HarvestSliceId = (typeof HARVEST_SLICE_IDS)[number];

/** Hunt 4: one window, one overlay checkbox. */
export const HUNT4_SLICE_ID = "t398To3900_sigmaNeg50ToNeg10" as const;

/** Hunt 5: same T window, σ ∈ [−20, 0]. */
export const HUNT5_SLICE_ID = "t398To3900_sigmaNeg20To0" as const;

export type OverlayHarvestSliceId =
  | HarvestSliceId
  | typeof HUNT4_SLICE_ID
  | typeof HUNT5_SLICE_ID;

export type OverlayHarvestSlice = {
  id: OverlayHarvestSliceId;
  url: string;
};

export type HarvestTBand = {
  id: HarvestTBandId;
  label: string;
  tMin: number;
  tMax: number;
  tMaxInclusive: boolean;
};

export const HARVEST_T_BANDS: readonly HarvestTBand[] = [
  { id: "t3975To4000", label: "T=3975 to 4000", tMin: 3975, tMax: 4000, tMaxInclusive: true },
  { id: "t3950To3975", label: "T=3950 to 3975", tMin: 3950, tMax: 3975, tMaxInclusive: false },
  { id: "t3925To3950", label: "T=3925 to 3950", tMin: 3925, tMax: 3950, tMaxInclusive: false },
  { id: "t3900To3925", label: "T=3900 to 3925", tMin: 3900, tMax: 3925, tMaxInclusive: false },
];

export type HarvestSlice = {
  id: HarvestSliceId;
  bandId: HarvestTBandId;
  sigmaSplit: HarvestSigmaSplit;
  url: string;
};

export const HARVEST_SLICES: readonly HarvestSlice[] = [
  {
    id: "t3975To4000_sigmaLt0",
    bandId: "t3975To4000",
    sigmaSplit: "sigmaLt0",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3975-to-4000-sigma-lt-0.bin`,
  },
  {
    id: "t3975To4000_sigma0To1",
    bandId: "t3975To4000",
    sigmaSplit: "sigma0To1",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3975-to-4000-sigma-0-to-1.bin`,
  },
  {
    id: "t3950To3975_sigmaLt0",
    bandId: "t3950To3975",
    sigmaSplit: "sigmaLt0",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3950-to-3975-sigma-lt-0.bin`,
  },
  {
    id: "t3950To3975_sigma0To1",
    bandId: "t3950To3975",
    sigmaSplit: "sigma0To1",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3950-to-3975-sigma-0-to-1.bin`,
  },
  {
    id: "t3925To3950_sigmaLt0",
    bandId: "t3925To3950",
    sigmaSplit: "sigmaLt0",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3925-to-3950-sigma-lt-0.bin`,
  },
  {
    id: "t3925To3950_sigma0To1",
    bandId: "t3925To3950",
    sigmaSplit: "sigma0To1",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3925-to-3950-sigma-0-to-1.bin`,
  },
  {
    id: "t3900To3925_sigmaLt0",
    bandId: "t3900To3925",
    sigmaSplit: "sigmaLt0",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3900-to-3925-sigma-lt-0.bin`,
  },
  {
    id: "t3900To3925_sigma0To1",
    bandId: "t3900To3925",
    sigmaSplit: "sigma0To1",
    url: `${import.meta.env.BASE_URL}zeros-of-f/t-3900-to-3925-sigma-0-to-1.bin`,
  },
];

export const HUNT4_SLICE: OverlayHarvestSlice = {
  id: HUNT4_SLICE_ID,
  url: `${import.meta.env.BASE_URL}zeros-of-f/t-398-to-3900-sigma-neg50-to-neg10.bin`,
};

export const HUNT5_SLICE: OverlayHarvestSlice = {
  id: HUNT5_SLICE_ID,
  url: `${import.meta.env.BASE_URL}zeros-of-f/t-398-to-3900-sigma-neg20-to-0.bin`,
};

export const OVERLAY_HARVEST_SLICES: readonly OverlayHarvestSlice[] = [
  ...HARVEST_SLICES.map((slice) => ({ id: slice.id, url: slice.url })),
  HUNT4_SLICE,
  HUNT5_SLICE,
];

/**
 * Which 25-wide overlay band contains index T, or null outside [3900, 4000].
 * 3925 / 3950 / 3975 sit in the higher band so the four strips do not overlap.
 */
export function harvestTBandId(T: number): HarvestTBandId | null {
  if (T >= 3975 && T <= 4000) return "t3975To4000";
  if (T >= 3950 && T < 3975) return "t3950To3975";
  if (T >= 3925 && T < 3950) return "t3925To3950";
  if (T >= 3900 && T < 3925) return "t3900To3925";
  return null;
}

/**
 * Whether σ belongs in the accordion column. The columns meet at 0.
 */
export function harvestSigmaSplitKeeps(sigma: number, split: HarvestSigmaSplit): boolean {
  if (split === "sigmaLt0") return sigma < 0;
  return sigma >= 0 && sigma <= 1;
}

/**
 * Slice id for a T-band plus σ column.
 */
export function harvestSliceId(bandId: HarvestTBandId, split: HarvestSigmaSplit): HarvestSliceId {
  if (bandId === "t3975To4000" && split === "sigmaLt0") return "t3975To4000_sigmaLt0";
  if (bandId === "t3975To4000" && split === "sigma0To1") return "t3975To4000_sigma0To1";
  if (bandId === "t3950To3975" && split === "sigmaLt0") return "t3950To3975_sigmaLt0";
  if (bandId === "t3950To3975" && split === "sigma0To1") return "t3950To3975_sigma0To1";
  if (bandId === "t3925To3950" && split === "sigmaLt0") return "t3925To3950_sigmaLt0";
  if (bandId === "t3925To3950" && split === "sigma0To1") return "t3925To3950_sigma0To1";
  if (bandId === "t3900To3925" && split === "sigmaLt0") return "t3900To3925_sigmaLt0";
  return "t3900To3925_sigma0To1";
}
