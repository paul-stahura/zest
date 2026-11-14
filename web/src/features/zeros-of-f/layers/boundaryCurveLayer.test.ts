import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";

import { BoundaryCurveLayer } from "@/features/zeros-of-f/layers/boundaryCurveLayer";

describe("BoundaryCurveLayer", () => {
  it("recomputes bounds after the first populate so a late-shown curve is not culled", () => {
    const parent = new THREE.Group();
    const layer = new BoundaryCurveLayer(parent, () => Number.NaN, 0xff0000);
    layer.configureRange(-100, 0, 0, 4000, "T");
    const empty = parent.children[0];
    if (!(empty instanceof THREE.Line)) throw new Error("expected a Line");
    expect(empty.geometry.drawRange.count).toBe(0);

    layer.setTOfSigma((sigma) => 0.3 * (-sigma) ** 1.6);
    layer.configureRange(-100, 0, 0, 4000, "T");
    layer.setVisible(true);
    expect(empty.geometry.drawRange.count).toBeGreaterThan(10);
    const sphere = empty.geometry.boundingSphere;
    if (sphere === null) throw new Error("bounding sphere was not computed");
    expect(sphere.radius).toBeGreaterThan(1);
  });

  it("samples σ from −1500 to 1", () => {
    const parent = new THREE.Group();
    const layer = new BoundaryCurveLayer(parent, (sigma) => Math.abs(sigma), 0xff0000);
    layer.configureRange(-10, 0, 0, 10, "T");
    const line = parent.children[0];
    if (!(line instanceof THREE.Line)) throw new Error("expected a Line");
    const arr = line.geometry.getAttribute("position").array;
    const count = line.geometry.drawRange.count;
    expect(count).toBeGreaterThan(2);
    expect(arr[0]).toBeCloseTo(-1500, 5);
    expect(arr[(count - 1) * 3]).toBeCloseTo(1, 5);
  });

  it("draws a width above 1px as a Line2", () => {
    const parent = new THREE.Group();
    const layer = new BoundaryCurveLayer(parent, (sigma) => Math.abs(sigma), 0xffffff, 4);
    layer.configureRange(-10, 0, 0, 10, "T");
    layer.setVisible(true);
    const line = parent.children[0];
    if (!(line instanceof Line2)) throw new Error("expected a Line2");
    expect(line.visible).toBe(true);
    expect(line.material.uniforms.linewidth?.value).toBe(4);
  });
});
