import * as THREE from "three";

import { getCircleSprite } from "@/features/zeros-of-f/layers/scanScatterLayer";
import type { ZerosDisplayView } from "@/features/zeros-of-f/types";
import { writeHarvestPoint } from "@/shared/math/zerosOfF/displayView";
import {
  SCORER_EXPANSION_N_MAX,
  SCORER_EXPANSION_ZEROS,
  scorerZeroExpansion,
  type ScorerExpansionSign,
  type ScorerZeroNumber,
} from "@/shared/math/zerosOfF/scorerZeroExpansion";
import type { HoverPointFn } from "@/shared/math/zerosOfF/zeroHoverPick";
import { imagToIndex } from "@/shared/math/zetaEms";
import { ancestorChainVisible } from "@/shared/rendering/ancestorChainVisible";

/**
 * s_{N,−} in warm colours and s_{N,+} in cool ones, darkening with n.
 * z_1 keeps the Theorem 5 gold and blue because those are the same points.
 */
const COLORS: Readonly<Record<ScorerZeroNumber, { readonly minus: number; readonly plus: number }>> = {
  1: { minus: 0xffd24a, plus: 0x4dc3ff },
  2: { minus: 0xff8a3d, plus: 0x5a78ff },
  3: { minus: 0xff4545, plus: 0xb06cff },
};
const SIGNS: readonly ScorerExpansionSign[] = [-1, 1];
/** Same size as the Theorem 5 dots; the computed zeros use 8 px, so both stay visible together. */
const DOT_SIZE = 6;

type Cloud = {
  readonly scorerZero: ScorerZeroNumber;
  readonly sign: ScorerExpansionSign;
  readonly points: THREE.Points;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.PointsMaterial;
  /** sRGB components 0..1, reported to the hover readout. */
  readonly rgb: readonly [number, number, number];
  sigma: Float64Array;
  indexT: Float64Array;
};

/**
 * Kuznetsov's eq. (37) points s_{N,±} for the Scorer zeros z_1, z_2, z_3
 * and N = 1, …, 4000: one cloud per zero and sign. The points are computed
 * the first time the layer is shown and placed like harvest zeros, so they
 * line up with the zeros in every display view.
 */
export class ScorerExpansionLayer {
  private readonly parent: THREE.Group;
  private readonly group: THREE.Group;
  private readonly clouds: readonly Cloud[];
  private computed = false;
  private yAxisMode: "T" | "fracT" = "T";
  private displayView: ZerosDisplayView = "rangeFracT";

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.clouds = SCORER_EXPANSION_ZEROS.flatMap((scorerZero) =>
      SIGNS.map((sign) => makeCloud(scorerZero, sign)));
    for (const cloud of this.clouds) this.group.add(cloud.points);
    this.parent.add(this.group);
  }

  public dispose(): void {
    this.parent.remove(this.group);
    for (const cloud of this.clouds) {
      cloud.geometry.dispose();
      cloud.material.dispose();
    }
  }

  /** Dots painted when this overlay is on; 0 when hidden. */
  public getDisplayedCount(): number {
    if (!this.group.visible) return 0;
    let total = 0;
    for (const cloud of this.clouds) total += cloud.geometry.drawRange.count;
    return total;
  }

  /** True when this overlay is painted, including a visible parent chain. */
  public acceptsHover(): boolean {
    return ancestorChainVisible(this.group) && this.computed;
  }

  /** Drawn points. σ and T are the point's coordinates, not the display y. */
  public visitHoverPoints(
    onPoint: HoverPointFn,
    keepLocal: ((x: number, y: number) => boolean) | null,
  ): void {
    for (const cloud of this.clouds) {
      const posAttr = cloud.geometry.getAttribute("position");
      if (!(posAttr instanceof THREE.BufferAttribute)) continue;
      const positions = posAttr.array;
      const n = Math.min(cloud.sigma.length, cloud.geometry.drawRange.count);
      for (let i = 0; i < n; i++) {
        const o = i * 3;
        const x = positions[o]!;
        const y = positions[o + 1]!;
        if (keepLocal !== null && !keepLocal(x, y)) continue;
        onPoint(
          cloud.sigma[i]!,
          cloud.indexT[i]!,
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
    if (visible && !this.computed) this.compute();
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

  private compute(): void {
    for (const cloud of this.clouds) {
      const sigma: number[] = [];
      const indexT: number[] = [];
      for (let n = 1; n <= SCORER_EXPANSION_N_MAX; n++) {
        const point = scorerZeroExpansion(cloud.scorerZero, n, cloud.sign);
        if (point === null) continue;
        const index = imagToIndex(point.t, false);
        if (!Number.isFinite(index)) continue;
        sigma.push(point.sigma);
        indexT.push(index);
      }
      cloud.sigma = Float64Array.from(sigma);
      cloud.indexT = Float64Array.from(indexT);
    }
    this.computed = true;
    this.rebuild();
  }

  private rebuild(): void {
    if (!this.computed) return;
    for (const cloud of this.clouds) {
      const n = cloud.sigma.length;
      const positions = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        writeHarvestPoint(positions, i * 3, cloud.sigma[i]!, cloud.indexT[i]!, this.displayView, this.yAxisMode);
      }
      cloud.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      cloud.geometry.setDrawRange(0, n);
      cloud.geometry.computeBoundingSphere();
    }
  }
}

function makeCloud(scorerZero: ScorerZeroNumber, sign: ScorerExpansionSign): Cloud {
  const color = sign === 1 ? COLORS[scorerZero].plus : COLORS[scorerZero].minus;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    color,
    size: DOT_SIZE,
    sizeAttenuation: false,
    map: getCircleSprite(),
    alphaTest: 0.5,
    transparent: true,
    opacity: 1,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const rgb: readonly [number, number, number] = [
    ((color >> 16) & 0xff) / 255,
    ((color >> 8) & 0xff) / 255,
    (color & 0xff) / 255,
  ];
  return {
    scorerZero,
    sign,
    points,
    geometry,
    material,
    rgb,
    sigma: new Float64Array(0),
    indexT: new Float64Array(0),
  };
}
