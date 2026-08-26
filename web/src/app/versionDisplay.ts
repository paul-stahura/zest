/**
 * Pure logic behind the header version badge — kept separate from the React
 * component so it can be unit-tested without a DOM.
 *
 * The badge reports the local dev/build timestamp injected by Vite as
 * `__BUILD_TIME__`: the dev-server start time in development, or the bundle
 * build time in a production build.
 */

export interface VersionDisplay {
  /** Short uppercase label. */
  label: string;
  /** True when the build timestamp is < 10 minutes old (badge turns green). */
  fresh: boolean;
  /** Relative age of the timestamp, e.g. "3m ago". */
  ageLabel: string;
  /** Secondary text, e.g. "started 8m ago". */
  detail: string;
  /** Full tooltip text. */
  title: string;
}

/** A build is "fresh" (green) for this long after its timestamp. */
export const FRESH_MS = 10 * 60 * 1000;

/** Coarse relative-age label. Returns "—" for non-finite / negative ages. */
export function relAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Fold the injected build timestamp and the current wall-clock into everything
 * the badge renders.
 *
 * @param buildTimeIso the Vite-injected build / dev-start timestamp.
 * @param nowMs        current time in ms (passed in so the result is pure/testable).
 */
export function deriveVersionDisplay(buildTimeIso: string, nowMs: number): VersionDisplay {
  const tsMs = Date.parse(buildTimeIso);
  const ageMs = Number.isFinite(tsMs) ? nowMs - tsMs : NaN;
  const fresh = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < FRESH_MS;
  const ageLabel = relAge(ageMs);

  return {
    label: "LOCAL",
    fresh,
    ageLabel,
    detail: `started ${ageLabel}`,
    title: `Running your LOCAL dev build (npm run dev) — live-reloads on edit. `
      + `Dev server started ${ageLabel}${buildTimeIso ? ` (${buildTimeIso})` : ""}.`,
  };
}
