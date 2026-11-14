import * as THREE from "three";

import { ScorerExpansionLayer } from "@/features/zeros-of-f/layers/scorerExpansionLayer";

type Visited = { sigma: number; indexT: number; y: number; z: number; r: number; g: number; b: number };

function visit(layer: ScorerExpansionLayer): Visited[] {
  const visited: Visited[] = [];
  layer.visitHoverPoints((sigma, indexT, _x, y, z, r, g, b) => {
    visited.push({ sigma, indexT, y, z, r, g, b });
  }, null);
  return visited;
}

describe("ScorerExpansionLayer", () => {
  it("draws s_N,± for z_1, z_2, z_3 once shown, skipping the N = 1 points with Im s ≤ 0", () => {
    const layer = new ScorerExpansionLayer(new THREE.Group());
    expect(layer.acceptsHover()).toBe(false);

    layer.setVisible(true);

    expect(layer.getDisplayedCount()).toBe(6 * 4000 - 3);
    const visited = visit(layer);
    const firstGold = visited[0];
    expect(firstGold?.sigma).toBeCloseTo(-4.590248311652627, 9);
    expect([firstGold?.r, firstGold?.g, firstGold?.b]).toEqual([1, 0xd2 / 255, 0x4a / 255]);
    const lastViolet = visited.at(-1);
    expect(lastViolet?.sigma).toBeCloseTo(-306.9278647961393, 9);
    expect(lastViolet?.indexT).toBeCloseTo(4000.166563005494, 6);
    expect(lastViolet?.y).toBeCloseTo(4000.166563005494, 2);
    expect([lastViolet?.r, lastViolet?.g, lastViolet?.b]).toEqual([0xb0 / 255, 0x6c / 255, 1]);
    layer.dispose();
  });

  it("moves each dot to {T} on the frac(T) axis and keeps full T for hover", () => {
    const layer = new ScorerExpansionLayer(new THREE.Group());
    layer.setVisible(true);

    layer.setYAxisMode("fracT");

    const lastViolet = visit(layer).at(-1);
    expect(lastViolet?.y).toBeCloseTo(0.166563005494, 4);
    expect(lastViolet?.indexT).toBeCloseTo(4000.166563005494, 6);
    layer.dispose();
  });

  it("puts {T} − 1/2 on the depth axis in the 3D view", () => {
    const layer = new ScorerExpansionLayer(new THREE.Group());
    layer.setVisible(true);

    layer.setDisplayView("fracT3d");

    const lastViolet = visit(layer).at(-1);
    expect(lastViolet?.y).toBeCloseTo(4000.166563005494, 2);
    expect(lastViolet?.z).toBeCloseTo(0.166563005494 - 0.5, 4);
    layer.dispose();
  });

  it("stops offering hover points once hidden", () => {
    const layer = new ScorerExpansionLayer(new THREE.Group());
    layer.setVisible(true);
    expect(layer.acceptsHover()).toBe(true);

    layer.setVisible(false);

    expect(layer.acceptsHover()).toBe(false);
    expect(layer.getDisplayedCount()).toBe(0);
    layer.dispose();
  });
});
