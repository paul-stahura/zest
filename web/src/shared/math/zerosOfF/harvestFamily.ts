/** Which packed harvest the zeros-of-f tab is showing. */
export type ZerosHarvestFamily = "siegel" | "r1ps" | "r2ps";

/**
 * Accept a saved or form string. Unknown values stay on Siegel’s f(s)
 * so old prefs do not land on an empty hunt view.
 */
export function parseZerosHarvestFamily(raw: unknown): ZerosHarvestFamily {
  if (raw === "r1ps") return "r1ps";
  if (raw === "r2ps") return "r2ps";
  return "siegel";
}

/** True when the tab is on the original Σ₁+R1ak harvest and its overlays. */
export function isSiegelZerosHarvest(family: ZerosHarvestFamily): boolean {
  return family === "siegel";
}
