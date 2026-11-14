import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import type { HoverPointFn } from "@/shared/math/zerosOfF/zeroHoverPick";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";

/**
 * Same `#FF00FF` the critical strip uses for the "Zeta Zeros" point set.
 * The hover ring uses the same magenta so it matches the dot.
 */
const ZETA_RING_R = 1;
const ZETA_RING_G = 0;
const ZETA_RING_B = 1;

/**
 * Same `#ff5252` the critical strip uses for the "Zeta Champions" point set.
 */
const CHAMPION_RING_R = 1;
const CHAMPION_RING_G = 82 / 255;
const CHAMPION_RING_B = 82 / 255;

/** All points sit on the critical line. */
const SIGMA_HALF = 0.5;

type MarkerSource = {
  color: number;
  ring: readonly [number, number, number];
  url: string;
  parse: (text: string) => Float64Array;
  logLabel: string;
  /** Light horizontal stroke from σ = 0 to σ = 1 at each marker height. */
  spanUnitInterval: boolean;
};

/** One positive index T per line. */
function parseIndexLines(text: string): Float64Array {
  const lines = text.split(/\r?\n/);
  const zerosT = new Float64Array(lines.length);
  let n = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const T = Number.parseFloat(trimmed);
    if (!Number.isFinite(T) || T <= 0) continue;
    zerosT[n++] = T;
  }
  return zerosT.subarray(0, n);
}

/**
 * Critical-strip champions CSV: σ, index T, with `#` comment lines.
 * The second column is already spiral index T.
 */
function parseChampionCsv(text: string): Float64Array {
  const lines = text.split(/\r?\n/);
  const values: number[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const comma = trimmed.indexOf(",");
    if (comma < 0) continue;
    const T = Number.parseFloat(trimmed.slice(comma + 1));
    if (!Number.isFinite(T) || T <= 0) continue;
    values.push(T);
  }
  return Float64Array.from(values);
}

const ZETA_SOURCE: MarkerSource = {
  color: 0xff00ff,
  ring: [ZETA_RING_R, ZETA_RING_G, ZETA_RING_B],
  url: "/zeta-zeros-10k-T.txt",
  parse: parseIndexLines,
  logLabel: "zeta-zeros",
  spanUnitInterval: true,
};

const CHAMPION_SOURCE: MarkerSource = {
  color: 0xff5252,
  ring: [CHAMPION_RING_R, CHAMPION_RING_G, CHAMPION_RING_B],
  url: `${import.meta.env.BASE_URL}critical-strip-points/champions_149_with_precise_T.csv`,
  parse: parseChampionCsv,
  logLabel: "zeta-champions",
  spanUnitInterval: true,
};

/**
 * Points on the critical line σ = 1/2 at spiral index T.
 * Fetched on first toggle-on; later toggles reuse the loaded geometry.
 */
export class ZetaZerosLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly material: THREE.PointsMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private readonly source: MarkerSource;
  private readonly spanGeometry: THREE.BufferGeometry | null;
  private readonly spanMaterial: THREE.LineBasicMaterial | null;
  private loadStarted = false;
  private loadedZeros: Float64Array | null = null;
  private yAxisMode: "T" | "fracT" = "T";

  public constructor(parent: THREE.Group, source: MarkerSource = ZETA_SOURCE) {
    this.source = source;
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.parent.add(this.group);
    if (source.spanUnitInterval) {
      this.spanGeometry = new THREE.BufferGeometry();
      this.spanGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
      this.spanGeometry.setDrawRange(0, 0);
      this.spanMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
      });
      const spans = new THREE.LineSegments(this.spanGeometry, this.spanMaterial);
      spans.frustumCulled = false;
      this.group.add(spans);
    } else {
      this.spanGeometry = null;
      this.spanMaterial = null;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      color: source.color,
      size: 3, // 1.5× the live-scatter base size of 2
      sizeAttenuation: false,
      map: getCircleSprite(),
      // alphaTest discards the square corners so dots render round and don't
      // occlude one another through transparent fragments.
      alphaTest: 0.5,
      transparent: true,
      opacity: 1.0,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    // Skip frustum culling — Three.js culls THREE.Points by the geometry's
    // bounding sphere, which under aggressive ortho zoom mistakenly classifies
    // tightly-clustered points as off-screen and the whole layer flickers
    // out. The point cloud is small (10k points), so always-render is fine.
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    this.geometry.dispose();
    this.material.dispose();
    this.spanGeometry?.dispose();
    this.spanMaterial?.dispose();
  }

  /** GPU draw count when this overlay is on; 0 when hidden. */
  public getDisplayedCount(): number {
    if (!this.group.visible) return 0;
    return this.geometry.drawRange.count;
  }

  /** True when the critical-line markers are painted. */
  public acceptsHover(): boolean {
    return ancestorChainVisible(this.group)
      && this.loadedZeros !== null
      && this.geometry.drawRange.count > 0;
  }

  /**
   * Drawn ζ zeros. Each marker sits at σ = 1/2. The stored ordinate is
   * index T even when the y axis is folded to {T}.
   */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    const tvals = this.loadedZeros;
    if (tvals === null) return;
    const posAttr = this.geometry.getAttribute("position");
    if (!(posAttr instanceof THREE.BufferAttribute)) return;
    const positions = posAttr.array;
    const n = Math.min(tvals.length, this.geometry.drawRange.count);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const x = positions[o]!;
      const y = positions[o + 1]!;
      if (keepLocal !== null && !keepLocal(x, y)) continue;
      onPoint(
        SIGMA_HALF,
        tvals[i]!,
        x,
        y,
        positions[o + 2]!,
        this.source.ring[0],
        this.source.ring[1],
        this.source.ring[2],
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

  /** Update positions when the y-axis mode flips between raw T and fracT. */
  public setYAxisMode(mode: "T" | "fracT"): void {
    if (this.yAxisMode === mode) return;
    this.yAxisMode = mode;
    if (this.loadedZeros !== null) this.applyZeros(this.loadedZeros);
  }

  private async loadZeros(): Promise<void> {
    try {
      // Ordinates are spiral index T, not Im(s).
      const resp = await fetch(this.source.url);
      if (!resp.ok) throw new Error(`HTTP ${String(resp.status)}`);
      const final = this.source.parse(await resp.text());
      this.loadedZeros = final;
      this.applyZeros(final);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[${this.source.logLabel}] failed to load:`, err);
    }
  }

  private applyZeros(zeros: Float64Array): void {
    const n = zeros.length;
    const positions = new Float32Array(n * 3);
    const fracT = this.yAxisMode === "fracT";
    for (let i = 0; i < n; i++) {
      const t = zeros[i]!;
      positions[i * 3 + 0] = SIGMA_HALF;
      positions[i * 3 + 1] = fracT ? t - Math.floor(t) : t;
      positions[i * 3 + 2] = 0;
    }
    const attr = new THREE.BufferAttribute(positions, 3);
    this.geometry.setAttribute("position", attr);
    this.geometry.setDrawRange(0, n);
    attr.needsUpdate = true;
    this.applySpans(positions, n);
  }

  /** One light segment per zero, from σ = 0 to σ = 1 at that height. */
  private applySpans(pointPositions: Float32Array, n: number): void {
    const geometry = this.spanGeometry;
    if (geometry === null) return;
    const segments = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const y = pointPositions[i * 3 + 1]!;
      const o = i * 6;
      segments[o] = 0;
      segments[o + 1] = y;
      segments[o + 3] = 1;
      segments[o + 4] = y;
    }
    const attr = new THREE.BufferAttribute(segments, 3);
    geometry.setAttribute("position", attr);
    geometry.setDrawRange(0, n * 2);
    attr.needsUpdate = true;
  }
}

/** |Z| peaks of zeta on σ = 1/2, in the critical-strip champion red. */
export class ZetaChampionsLayer extends ZetaZerosLayer {
  public constructor(parent: THREE.Group) {
    super(parent, CHAMPION_SOURCE);
  }
}
