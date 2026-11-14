import * as THREE from "three";

import { ScanScatterLayer } from "@/features/zeros-of-f/layers/scanScatterLayer";
import { DEFAULT_STATE } from "@/features/zeros-of-f/types";
import type { ScanLine } from "@/shared/scan/scanBackend";

function makeLine(sigma: number, tValues: number[]): ScanLine {
  const t = new Float64Array(tValues);
  const yVal = new Float64Array(tValues.map((value) => value / 10));
  const sigma1Mag = new Float64Array(tValues.map((value) => value + 1));
  const r1Mag = new Float64Array(tValues.map((value) => value + 2));
  const phaseDev = new Float64Array(tValues.map((value) => value + 3));
  return {
    sigma,
    t,
    yVal,
    sigma1Mag,
    r1Mag,
    phaseDev,
  };
}

function firstPoints(parent: THREE.Group): THREE.Points {
  const layerGroup = parent.children[0];
  if (!(layerGroup instanceof THREE.Group)) {
    throw new Error("scatter parent child is not a Group");
  }
  const points = layerGroup.children[0];
  if (!(points instanceof THREE.Points)) {
    throw new Error("scatter child is not Points");
  }
  return points;
}

describe("ScanScatterLayer", () => {
  it("preserves point data when appending multiple scan lines as a batch", () => {
    const parent = new THREE.Group();
    const layer = new ScanScatterLayer(parent, DEFAULT_STATE.display);
    try {
      layer.appendLines([
        makeLine(-10, [1, 2]),
        makeLine(-9, [3]),
      ]);

      const points: Array<{ sigma: number; t: number; yVal: number }> = [];
      layer.forEachPoint((sigma, t, yVal) => points.push({ sigma, t, yVal }));

      expect(points).toEqual([
        { sigma: -10, t: 1, yVal: 0.1 },
        { sigma: -10, t: 2, yVal: 0.2 },
        { sigma: -9, t: 3, yVal: 0.3 },
      ]);
    } finally {
      layer.dispose();
    }
  });

  it("filters frac(T) in the shader without rewriting point buffers", () => {
    const parent = new THREE.Group();
    const layer = new ScanScatterLayer(parent, DEFAULT_STATE.display);
    try {
      layer.appendPoints([-12, -8, -4], [4.1, 5.8, 6.1], [0.2, 0.3, 0.4]);
      const points = firstPoints(parent);
      const position = points.geometry.getAttribute("position");
      const color = points.geometry.getAttribute("color");
      if (!(position instanceof THREE.BufferAttribute) || !(color instanceof THREE.BufferAttribute)) {
        throw new Error("scatter attributes are not BufferAttributes");
      }
      const positionVersion = position.version;
      const colorVersion = color.version;
      layer.setDisplay({
        ...DEFAULT_STATE.display,
        fracTFilterKind: "justOne",
        fracTJustOne: 0.1,
      });
      expect(position.version).toBe(positionVersion);
      expect(color.version).toBe(colorVersion);
      expect(points.geometry.drawRange.count).toBe(3);
      expect(layer.getDrawnCount()).toBe(2);
      const stored: number[] = [];
      layer.forEachPoint((_sigma, t) => stored.push(t));
      expect(stored).toEqual([4.1, 5.8, 6.1]);
    } finally {
      layer.dispose();
    }
  });

  it("hovers only the dots the frac(T) filter keeps", () => {
    const parent = new THREE.Group();
    const layer = new ScanScatterLayer(parent, DEFAULT_STATE.display);
    try {
      layer.appendPoints([-12, -8, -4], [4.1, 5.8, 6.1], [0.2, 0.3, 0.4]);
      layer.setDisplay({
        ...DEFAULT_STATE.display,
        fracTFilterKind: "justOne",
        fracTJustOne: 0.1,
      });
      const visited: Array<{ t: number; pointId: number }> = [];
      layer.visitHoverPoints((_sigma, t, _x, _y, _z, _r, _g, _b, pointId) => {
        visited.push({ t, pointId });
      }, null);
      expect(visited).toEqual([
        { t: 4.1, pointId: 0 },
        { t: 6.1, pointId: 2 },
      ]);
    } finally {
      layer.dispose();
    }
  });

  it("moves only the .75–1 dots by the twin-drag offset", () => {
    const parent = new THREE.Group();
    const display = {
      ...DEFAULT_STATE.display,
      fracTFilterKind: "range" as const,
      fracTQuarterEnabled: true,
      fracTQuarterPreset: "q25" as const,
      fracTTwinNudge: true,
    };
    const layer = new ScanScatterLayer(parent, display);
    try {
      layer.setTwinDragTarget(true);
      layer.appendPoints([-12, -8, -4], [4.3, 5.8, 6.1], [0.2, 0.3, 0.4]);
      layer.setTwinOffset(1, 2);
      const visited: Array<{ x: number; y: number }> = [];
      layer.visitHoverPoints((_sigma, _t, x, y) => {
        visited.push({ x, y });
      }, null);
      expect(visited).toHaveLength(2);
      expect(visited[0]!.x).toBeCloseTo(-12, 5);
      expect(visited[0]!.y).toBeCloseTo(4.3, 5);
      expect(visited[1]!.x).toBeCloseTo(-7, 5);
      expect(visited[1]!.y).toBeCloseTo(7.8, 5);
    } finally {
      layer.dispose();
    }
  });

  it("lifts {T} onto Z when the display is 3D", () => {
    const parent = new THREE.Group();
    const layer = new ScanScatterLayer(parent, {
      ...DEFAULT_STATE.display,
      displayView: "fracT3d",
    });
    try {
      layer.appendPoints([-12], [6.25], [0.2]);
      const layerGroup = parent.children[0];
      if (!(layerGroup instanceof THREE.Group)) {
        throw new Error("scatter parent child is not a Group");
      }
      const points = layerGroup.children[0];
      if (!(points instanceof THREE.Points)) {
        throw new Error("scatter child is not Points");
      }
      const pos = points.geometry.getAttribute("position");
      expect(pos.getX(0)).toBe(-12);
      expect(pos.getY(0)).toBe(6.25);
      expect(pos.getZ(0)).toBe(-0.25);
    } finally {
      layer.dispose();
    }
  });

  it("appends independent sigma points in one batch", () => {
    const parent = new THREE.Group();
    const layer = new ScanScatterLayer(parent, DEFAULT_STATE.display);
    try {
      layer.appendPoints([-12, -8], [4, 5], [0.2, 0.3]);
      const points: Array<{ sigma: number; t: number; yVal: number }> = [];
      layer.forEachPoint((sigma, t, yVal) => points.push({ sigma, t, yVal }));
      expect(points).toEqual([
        { sigma: -12, t: 4, yVal: 0.2 },
        { sigma: -8, t: 5, yVal: 0.3 },
      ]);
    } finally {
      layer.dispose();
    }
  });
});
