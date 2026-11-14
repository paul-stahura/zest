import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import {
  DEFAULT_SPECTRUM_FEATHER,
  quarterSpectrumRgb,
} from "@/features/zeros-of-f/fracToHue";
import type { DisplayControlsState } from "@/features/zeros-of-f/types";
import {
  parseAkZerosBin,
  selectAkZeros,
  type AkSigmaBand,
  type AkZerosFilter,
  type AkZerosPoints,
} from "@/shared/io/akZerosBin";
import { writeHarvestPoint } from "@/shared/math/zerosOfF/displayView";
import { fracT32, fracTGpuBands } from "@/shared/math/zerosOfF/fracTGpuBands";
import type { HoverPointFn } from "@/shared/math/zerosOfF/zeroHoverPick";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";
import { FRAC_T_ATTRIBUTE, FracTPointsFilter } from "@/shared/rendering/fracTPointsFilter";
import type { ZerosDisplayView } from "@/features/zeros-of-f/types";

type ColorMode = DisplayControlsState["colorMode"];

const AK_ZEROS_URL = `${import.meta.env.BASE_URL}zeros-of-f/ak-zeros.bin`;

const akZerosByUrl = new Map<string, Promise<AkZerosPoints>>();

function fetchAkZeros(url: string): Promise<AkZerosPoints> {
  const cached = akZerosByUrl.get(url);
  if (cached !== undefined) return cached;
  const pending = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`AK zeros HTTP ${String(response.status)}`);
    }
    return parseAkZerosBin(await response.arrayBuffer());
  });
  akZerosByUrl.set(url, pending);
  return pending;
}

/**
 * Combined Arias–Keating f-zeros through Im(s) = 10⁶, plotted at index T.
 */
export class AkZerosLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly material: THREE.PointsMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private colorAttr: THREE.BufferAttribute | null = null;
  private loadStarted = false;
  private loaded: AkZerosPoints | null = null;
  private readonly url: string;
  private yAxisMode: "T" | "fracT" = "T";
  private displayView: ZerosDisplayView = "rangeFracT";
  private colorMode: ColorMode = "spectrum";
  private spectrumFeather = DEFAULT_SPECTRUM_FEATHER;
  private sigmaGreaterThanNeg50 = true;
  private readonly sigmaBand: AkSigmaBand;
  private fracTRangeMin = 0;
  private fracTRangeMax = 1;
  private fracTRangeMode: AkZerosFilter["fracTRangeMode"] = "between";
  private fracTFilterKind: NonNullable<AkZerosFilter["fracTFilterKind"]> = "range";
  private fracTJustOne = 0;
  private fracTJustOneDigits: NonNullable<AkZerosFilter["fracTJustOneDigits"]> = 3;
  private fracTQuarterEnabled = false;
  private fracTQuarterPreset: NonNullable<AkZerosFilter["fracTQuarterPreset"]> = "ends";
  /** Rows in the GPU buffer after the σ split; frac(T) is filtered in the shader. */
  private drawnSigma: Float64Array = new Float64Array(0);
  private drawnT: Float64Array = new Float64Array(0);
  private drawnFrac = new Float32Array(0);
  private readonly fracFilter: FracTPointsFilter;
  private keptCache = { filterVersion: -1, rows: new Float32Array(0), kept: 0 };

  public constructor(
    parent: THREE.Group,
    sigmaBand: AkSigmaBand = "gtNeg50",
    url: string = AK_ZEROS_URL,
  ) {
    this.sigmaBand = sigmaBand;
    this.url = url;
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.parent.add(this.group);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 2,
      sizeAttenuation: false,
      map: getCircleSprite(),
      alphaTest: 0.5,
      transparent: true,
      opacity: 1,
    });
    this.fracFilter = new FracTPointsFilter(this.material);
    this.geometry.setAttribute(FRAC_T_ATTRIBUTE, new THREE.BufferAttribute(this.drawnFrac, 1));
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.geometry.dispose();
    this.material.dispose();
  }

  /** Dots painted after the frac(T) filter when this overlay is on; 0 when hidden. */
  public getDisplayedCount(): number {
    if (!this.group.visible) return 0;
    const rows = this.drawnFrac;
    if (this.fracFilter.isInactive()) return rows.length;
    const filterVersion = this.fracFilter.getVersion();
    const cache = this.keptCache;
    if (cache.filterVersion === filterVersion && cache.rows === rows) return cache.kept;
    let kept = 0;
    for (let i = 0; i < rows.length; i++) {
      if (this.fracFilter.keeps(rows[i]!)) kept += 1;
    }
    this.keptCache = { filterVersion, rows, kept };
    return kept;
  }

  /** True when this overlay is painted, including a visible parent chain. */
  public acceptsHover(): boolean {
    return ancestorChainVisible(this.group) && this.geometry.drawRange.count > 0;
  }

  /**
   * Drawn AK zeros. Positions are display-space; σ and T are the zero's
   * coordinates, which stay full index T when the y axis shows {T}.
   * Rows the shader hides by frac(T) are skipped with the same test.
   */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    const n = Math.min(this.drawnSigma.length, this.drawnT.length, this.geometry.drawRange.count);
    const posAttr = this.geometry.getAttribute("position");
    if (!(posAttr instanceof THREE.BufferAttribute)) return;
    const positions = posAttr.array;
    const colors = this.colorAttr === null ? null : this.colorAttr.array;
    const fracs = this.drawnFrac;
    const inactive = this.fracFilter.isInactive();
    for (let i = 0; i < n; i++) {
      if (!inactive && !this.fracFilter.keeps(fracs[i]!)) continue;
      const o = i * 3;
      const x = positions[o]!;
      const y = positions[o + 1]!;
      if (keepLocal !== null && !keepLocal(x, y)) continue;
        onPoint(
        this.drawnSigma[i]!,
        this.drawnT[i]!,
        x,
        y,
        positions[o + 2]!,
        colors === null ? 1 : colors[o]!,
        colors === null ? 1 : colors[o + 1]!,
        colors === null ? 1 : colors[o + 2]!,
        -1,
      );
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible && !this.loadStarted) {
      this.loadStarted = true;
      void this.loadZeros();
    }
  }

  public setYAxisMode(mode: "T" | "fracT"): void {
    if (this.yAxisMode === mode) return;
    this.yAxisMode = mode;
    this.rebuild();
  }

  public setDisplayView(view: ZerosDisplayView): void {
    if (this.displayView === view) return;
    this.displayView = view;
    this.rebuild();
  }

  public setColorMode(mode: ColorMode): void {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    if (this.loaded !== null) this.recolor(this.selected().t);
  }

  public setSpectrumFeather(feather: number): void {
    if (this.spectrumFeather === feather) return;
    this.spectrumFeather = feather;
    if (this.loaded !== null && this.colorMode !== "grayscale") {
      this.recolor(this.selected().t);
    }
  }

  public setSigmaGreaterThanNeg50(on: boolean): void {
    if (this.sigmaGreaterThanNeg50 === on) return;
    this.sigmaGreaterThanNeg50 = on;
    this.rebuild();
  }

  public setFracTRange(
    min: number,
    max: number,
    mode: AkZerosFilter["fracTRangeMode"],
    kind: NonNullable<AkZerosFilter["fracTFilterKind"]> = "range",
    justOne = 0,
    justOneDigits: NonNullable<AkZerosFilter["fracTJustOneDigits"]> = 3,
    quarterEnabled = false,
    quarterPreset: NonNullable<AkZerosFilter["fracTQuarterPreset"]> = "ends",
  ): void {
    if (
      this.fracTRangeMin === min
      && this.fracTRangeMax === max
      && this.fracTRangeMode === mode
      && this.fracTFilterKind === kind
      && this.fracTJustOne === justOne
      && this.fracTJustOneDigits === justOneDigits
      && this.fracTQuarterEnabled === quarterEnabled
      && this.fracTQuarterPreset === quarterPreset
    ) {
      return;
    }
    this.fracTRangeMin = min;
    this.fracTRangeMax = max;
    this.fracTRangeMode = mode;
    this.fracTFilterKind = kind;
    this.fracTJustOne = justOne;
    this.fracTJustOneDigits = justOneDigits;
    this.fracTQuarterEnabled = quarterEnabled;
    this.fracTQuarterPreset = quarterPreset;
    this.fracFilter.setBands(fracTGpuBands({
      kind,
      rangeMin: min,
      rangeMax: max,
      rangeMode: mode,
      justOne,
      justOneDigits,
      quarterEnabled,
      quarterPreset,
    }, false));
  }

  /** σ split only. The frac(T) filter runs in the shader. */
  private selected(): AkZerosPoints {
    if (this.loaded === null) {
      return { sigma: new Float64Array(0), t: new Float64Array(0) };
    }
    return selectAkZeros(this.loaded, {
      sigmaGreaterThanNeg50: this.sigmaGreaterThanNeg50,
      sigmaBand: this.sigmaBand,
      fracTRangeMin: 0,
      fracTRangeMax: 1,
      fracTRangeMode: "between",
    });
  }

  private async loadZeros(): Promise<void> {
    try {
      this.loaded = await fetchAkZeros(this.url);
      this.rebuild();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[ak-zeros] failed to load:", error);
    }
  }

  private rebuild(): void {
    if (this.loaded === null) return;
    const filtered = this.selected();
    this.drawnSigma = filtered.sigma;
    this.drawnT = filtered.t;
    const n = filtered.sigma.length;
    const positions = new Float32Array(n * 3);
    const fracs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      writeHarvestPoint(
        positions,
        i * 3,
        filtered.sigma[i]!,
        filtered.t[i]!,
        this.displayView,
        this.yAxisMode,
      );
      fracs[i] = fracT32(filtered.t[i]!);
    }
    this.drawnFrac = fracs;
    const attr = new THREE.BufferAttribute(positions, 3);
    this.geometry.setAttribute("position", attr);
    this.geometry.setAttribute(FRAC_T_ATTRIBUTE, new THREE.BufferAttribute(fracs, 1));
    const colorAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    this.colorAttr = colorAttr;
    this.geometry.setAttribute("color", colorAttr);
    this.geometry.setDrawRange(0, n);
    this.recolor(filtered.t);
  }

  private recolor(tvals: Float64Array): void {
    const colorAttr = this.colorAttr;
    if (colorAttr === null) return;
    const colors = colorAttr.array;
    const n = tvals.length;
    if (colors.length < n * 3) return;
    const gray = this.colorMode === "grayscale";
    for (let i = 0; i < n; i++) {
      if (gray) {
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.2;
        continue;
      }
      const T = tvals[i]!;
      const [r, g, b] = quarterSpectrumRgb(T - Math.floor(T), this.spectrumFeather);
      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    colorAttr.needsUpdate = true;
  }
}
