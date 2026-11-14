import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import type { ZerosDisplayView } from "@/features/zeros-of-f/types";
import {
  parseScorerZerosCsv,
  type ScorerResonanceZeros,
  type ScorerZeroCounts,
  type ScorerZeros,
} from "@/shared/io/scorerZerosCsv";
import { writeHarvestPoint } from "@/shared/math/zerosOfF/displayView";
import type { HoverPointFn } from "@/shared/math/zerosOfF/zeroHoverPick";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";

const SCORER_ZEROS_URL = `${import.meta.env.BASE_URL}zeros-of-f/scorer-z1-zeros.csv`;

/** Same gold and blue as the Theorem 5 points the zeros were seeded from. */
const NU0_COLOR = 0xffd24a;
const NU1_COLOR = 0x4dc3ff;
/** Half the previous 8 px, so the harvest zeros underneath stay readable. */
const DOT_SIZE = 4;
/** Half opacity. alphaTest stays at half the old 0.5 so the circle edge does not collapse. */
const DOT_OPACITY = 0.5;

/**
 * `scripts/find_scorer_zeros.py` rewrites the CSV in place, so every fetch
 * revalidates with the server instead of reusing an earlier copy.
 */
async function fetchScorerZeros(): Promise<ScorerZeros> {
  const response = await fetch(SCORER_ZEROS_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Scorer zeros HTTP ${String(response.status)}`);
  }
  return parseScorerZerosCsv(await response.text());
}

type ScorerZerosLayerOptions = {
  /** Runs after each successful load, e.g. to refresh counts in the toolbox. */
  onLoaded?: () => void;
  loadZeros?: () => Promise<ScorerZeros>;
};

type Cloud = {
  readonly points: THREE.Points;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.PointsMaterial;
  /** sRGB components 0..1, reported to the hover readout. */
  readonly rgb: readonly [number, number, number];
  zeros: ScorerResonanceZeros;
};

/**
 * Computed left-most Scorer zeros (the z₁ family) from
 * `public/zeros-of-f/scorer-z1-zeros.csv`: ν = 0 in gold, ν = 1 in blue.
 * Dots use the harvest's placement, so each one sits on its harvest zero in
 * every display view. The CSV is fetched the first time the layer is shown
 * and again on each {@link reload}.
 */
export class ScorerZerosLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly clouds: readonly [Cloud, Cloud];
  private readonly loadZeros: () => Promise<ScorerZeros>;
  private readonly onLoaded: (() => void) | undefined;
  private loadStarted = false;
  private loading = false;
  private loaded = false;
  private disposed = false;
  private yAxisMode: "T" | "fracT" = "T";
  private displayView: ZerosDisplayView = "rangeFracT";

  public constructor(parent: THREE.Group, options: ScorerZerosLayerOptions = {}) {
    this.parent = parent;
    this.loadZeros = options.loadZeros ?? fetchScorerZeros;
    this.onLoaded = options.onLoaded;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.clouds = [makeCloud(NU0_COLOR), makeCloud(NU1_COLOR)];
    for (const cloud of this.clouds) this.group.add(cloud.points);
    this.parent.add(this.group);
  }

  public dispose(): void {
    this.disposed = true;
    this.parent.remove(this.group);
    for (const cloud of this.clouds) {
      cloud.geometry.dispose();
      cloud.material.dispose();
    }
  }

  /** Dots painted when this overlay is on; 0 when hidden or not yet loaded. */
  public getDisplayedCount(): number {
    if (!this.group.visible) return 0;
    return this.clouds[0].geometry.drawRange.count + this.clouds[1].geometry.drawRange.count;
  }

  /** Zeros per resonance in the last loaded CSV; null until one has loaded. */
  public getLoadedCounts(): ScorerZeroCounts | null {
    if (!this.loaded) return null;
    return { nu0: this.clouds[0].zeros.sigma.length, nu1: this.clouds[1].zeros.sigma.length };
  }

  /** True when this overlay is painted, including a visible parent chain. */
  public acceptsHover(): boolean {
    return ancestorChainVisible(this.group) && this.loaded;
  }

  /** Drawn zeros. σ and T are the zero's coordinates, not the display y. */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    for (const cloud of this.clouds) {
      const posAttr = cloud.geometry.getAttribute("position");
      if (!(posAttr instanceof THREE.BufferAttribute)) continue;
      const positions = posAttr.array;
      const n = Math.min(cloud.zeros.sigma.length, cloud.geometry.drawRange.count);
      for (let i = 0; i < n; i++) {
        const o = i * 3;
        const x = positions[o]!;
        const y = positions[o + 1]!;
        if (keepLocal !== null && !keepLocal(x, y)) continue;
        onPoint(
          cloud.zeros.sigma[i]!,
          cloud.zeros.indexT[i]!,
          x,
          y,
          positions[o + 2]!,
          cloud.rgb[0],
          cloud.rgb[1],
          cloud.rgb[2],
          -1,
        );
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible && !this.loadStarted) this.reload();
  }

  /**
   * Fetch the CSV again, so a file regenerated while the page is open
   * replaces the dots already drawn. Skipped while a fetch is in flight:
   * that fetch already reads the current file.
   */
  public reload(): void {
    if (this.loading) return;
    this.loadStarted = true;
    this.loading = true;
    void this.load();
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

  private async load(): Promise<void> {
    try {
      const zeros = await this.loadZeros();
      if (this.disposed) return;
      this.clouds[0].zeros = zeros.nu0;
      this.clouds[1].zeros = zeros.nu1;
      this.loaded = true;
      this.rebuild();
      this.onLoaded?.();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[scorer-zeros] failed to load:", error);
    } finally {
      this.loading = false;
    }
  }

  private rebuild(): void {
    if (!this.loaded) return;
    for (const cloud of this.clouds) {
      const { sigma, indexT } = cloud.zeros;
      const n = sigma.length;
      const positions = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        writeHarvestPoint(positions, i * 3, sigma[i]!, indexT[i]!, this.displayView, this.yAxisMode);
      }
      cloud.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      cloud.geometry.setDrawRange(0, n);
      cloud.geometry.computeBoundingSphere();
    }
  }
}

function makeCloud(color: number): Cloud {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    color,
    size: DOT_SIZE,
    sizeAttenuation: false,
    map: getCircleSprite(),
    alphaTest: DOT_OPACITY / 2,
    transparent: true,
    opacity: DOT_OPACITY,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const rgb: readonly [number, number, number] = [
    ((color >> 16) & 0xff) / 255,
    ((color >> 8) & 0xff) / 255,
    (color & 0xff) / 255,
  ];
  return {
    points,
    geometry,
    material,
    rgb,
    zeros: { sigma: new Float64Array(0), indexT: new Float64Array(0) },
  };
}
