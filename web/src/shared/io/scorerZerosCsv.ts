/** One resonance's zeros, in file order. */
export type ScorerResonanceZeros = {
  sigma: Float64Array;
  /** Spiral index T of each zero, not Im s. */
  indexT: Float64Array;
};

/**
 * Left-most Scorer zeros (the z₁ family) written by
 * `web/scripts/find_scorer_zeros.py`. `nu0` is the resonance near y = −½,
 * which follows σ ≈ −(C t^{1/3} + D t^{1/6} + E); `nu1` is the one near
 * y = +½.
 */
export type ScorerZeros = {
  nu0: ScorerResonanceZeros;
  nu1: ScorerResonanceZeros;
};

/** How many zeros each resonance has in the loaded CSV. */
export type ScorerZeroCounts = {
  nu0: number;
  nu1: number;
};

type RequiredColumn = "nu" | "sigma" | "T";

/**
 * Parse the Scorer-zeros CSV: `#` comment lines, one header row naming at
 * least `nu`, `sigma`, and `T` (extra diagnostic columns are ignored), then
 * one row per zero.
 *
 * @throws when the header lacks a required column or a row holds a bad value,
 *   so a damaged asset fails loudly instead of drawing a partial track.
 */
export function parseScorerZerosCsv(text: string): ScorerZeros {
  const lines = text.split(/\r?\n/);
  let columns: Record<RequiredColumn, number> | null = null;
  const sigma: [number[], number[]] = [[], []];
  const indexT: [number[], number[]] = [[], []];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const trimmed = (lines[lineIndex] ?? "").trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const fields = trimmed.split(",");
    if (columns === null) {
      columns = headerColumns(fields);
      continue;
    }
    const lineNumber = lineIndex + 1;
    const nu = numberField(fields, columns.nu);
    const s = numberField(fields, columns.sigma);
    const index = numberField(fields, columns.T);
    if (nu !== 0 && nu !== 1) {
      throw new Error(`Scorer zeros line ${String(lineNumber)}: nu must be 0 or 1`);
    }
    if (!Number.isFinite(s)) {
      throw new Error(`Scorer zeros line ${String(lineNumber)}: sigma is not a number`);
    }
    if (!Number.isFinite(index) || index <= 0) {
      throw new Error(`Scorer zeros line ${String(lineNumber)}: T must be a positive number`);
    }
    sigma[nu].push(s);
    indexT[nu].push(index);
  }

  if (columns === null) throw new Error("Scorer zeros CSV has no header row");
  return {
    nu0: { sigma: Float64Array.from(sigma[0]), indexT: Float64Array.from(indexT[0]) },
    nu1: { sigma: Float64Array.from(sigma[1]), indexT: Float64Array.from(indexT[1]) },
  };
}

/** NaN for a missing or blank field, so a blank `nu` never reads as ν = 0. */
function numberField(fields: string[], index: number): number {
  const field = fields[index];
  return field === undefined ? Number.NaN : Number.parseFloat(field);
}

function headerColumns(fields: string[]): Record<RequiredColumn, number> {
  const names = fields.map((field) => field.trim());
  const at = (name: RequiredColumn): number => {
    const index = names.indexOf(name);
    if (index === -1) throw new Error(`Scorer zeros CSV header is missing "${name}"`);
    return index;
  };
  return { nu: at("nu"), sigma: at("sigma"), T: at("T") };
}
