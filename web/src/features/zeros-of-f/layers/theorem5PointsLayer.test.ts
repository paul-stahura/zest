import * as THREE from "three";

import { Theorem5PointsLayer } from "@/features/zeros-of-f/layers/theorem5PointsLayer";

describe("Theorem5PointsLayer", () => {
  it("draws both resonances through the slider N", () => {
    const parent = new THREE.Group();
    const layer = new Theorem5PointsLayer(parent);
    layer.setMaxN(100, "T");
    const group = parent.children[0];
    if (!(group instanceof THREE.Group)) throw new Error("expected a group");
    expect(group.visible).toBe(true);
    const lower = group.children[0];
    const upper = group.children[1];
    if (!(lower instanceof THREE.Points) || !(upper instanceof THREE.Points)) {
      throw new Error("expected two point clouds");
    }
    expect(lower.geometry.drawRange.count).toBe(100);
    expect(upper.geometry.drawRange.count).toBe(100);
    const lowerPos = lower.geometry.getAttribute("position").array;
    const last = 99 * 3;
    expect(lowerPos[last]).toBeCloseTo(-41.515583, 3);
    layer.setMaxN(0, "T");
    expect(group.visible).toBe(false);
    layer.dispose();
  });
});