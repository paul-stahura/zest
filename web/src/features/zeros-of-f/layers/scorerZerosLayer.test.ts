import * as THREE from "three";

import { ScorerZerosLayer } from "@/features/zeros-of-f/layers/scorerZerosLayer";
import type { ScorerZeros } from "@/shared/io/scorerZerosCsv";

type Visited = { sigma: number; indexT: number; x: number; y: number; r: number; b: number };

function sampleZeros(): ScorerZeros {
  return {
    nu0: {
      sigma: Float64Array.from([-79.848306540, -95.886977808]),
      indexT: Float64Array.from([299.662143724, 398.670057707]),
    },
    nu1: {
      sigma: Float64Array.from([-58.959005617]),
      indexT: Float64Array.from([300.160389525]),
    },
  };
}

function visit(layer: ScorerZerosLayer): Visited[] {
  const visited: Visited[] = [];
  layer.visitHoverPoints((sigma, indexT, x, y, _z, r, _g, b) => {
    visited.push({ sigma, indexT, x, y, r, b });
  }, null);
  return visited;
}

describe("ScorerZerosLayer", () => {
  it("loads on first show and draws ν = 0 in gold and ν = 1 in blue at index T", async () => {
    const loadZeros = vi.fn(() => Promise.resolve(sampleZeros()));
    const layer = new ScorerZerosLayer(new THREE.Group(), { loadZeros });
    expect(loadZeros).not.toHaveBeenCalled();

    layer.setVisible(true);
    await vi.waitFor(() => {
      expect(layer.getDisplayedCount()).toBe(3);
    });
    layer.setVisible(false);
    layer.setVisible(true);

    expect(loadZeros).toHaveBeenCalledTimes(1);
    const visited = visit(layer);
    expect(visited.map((point) => point.sigma)).toEqual([-79.848306540, -95.886977808, -58.959005617]);
    expect(visited[0]?.y).toBeCloseTo(299.662143724, 3);
    expect(visited[0]?.r).toBe(1);
    expect(visited[2]?.b).toBe(1);
    layer.dispose();
  });

  it("redraws from a regenerated CSV on reload and reports the new counts", async () => {
    const regenerated: ScorerZeros = {
      nu0: {
        sigma: Float64Array.from([-79.848306540, -95.886977808, -200.1]),
        indexT: Float64Array.from([299.662143724, 398.670057707, 1200.5]),
      },
      nu1: {
        sigma: Float64Array.from([-58.959005617, -180.2, -300]),
        indexT: Float64Array.from([300.160389525, 1300.2, 1400.1]),
      },
    };
    let file: ScorerZeros = sampleZeros();
    const loadZeros = vi.fn(() => Promise.resolve(file));
    const onLoaded = vi.fn();
    const layer = new ScorerZerosLayer(new THREE.Group(), { loadZeros, onLoaded });
    expect(layer.getLoadedCounts()).toBeNull();

    layer.setVisible(true);
    await vi.waitFor(() => {
      expect(layer.getLoadedCounts()).toEqual({ nu0: 2, nu1: 1 });
    });
    file = regenerated;
    layer.reload();

    await vi.waitFor(() => {
      expect(layer.getLoadedCounts()).toEqual({ nu0: 3, nu1: 3 });
    });
    expect(layer.getDisplayedCount()).toBe(6);
    expect(onLoaded).toHaveBeenCalledTimes(2);
    layer.dispose();
  });

  it("skips a reload while the first fetch is still in flight", async () => {
    let finishLoad: (zeros: ScorerZeros) => void = () => undefined;
    const loadZeros = vi.fn(() => new Promise<ScorerZeros>((resolve) => {
      finishLoad = resolve;
    }));
    const layer = new ScorerZerosLayer(new THREE.Group(), { loadZeros });

    layer.setVisible(true);
    layer.reload();
    finishLoad(sampleZeros());

    await vi.waitFor(() => {
      expect(layer.getDisplayedCount()).toBe(3);
    });
    expect(loadZeros).toHaveBeenCalledTimes(1);
    layer.dispose();
  });

  it("moves each dot to {T} when the y axis shows frac(T), keeping full T for hover", async () => {
    const layer = new ScorerZerosLayer(new THREE.Group(), { loadZeros: () => Promise.resolve(sampleZeros()) });
    layer.setVisible(true);
    await vi.waitFor(() => {
      expect(layer.acceptsHover()).toBe(true);
    });

    layer.setYAxisMode("fracT");

    const first = visit(layer)[0];
    expect(first?.y).toBeCloseTo(0.662143724, 3);
    expect(first?.indexT).toBe(299.662143724);
    layer.dispose();
  });

  it("stops offering hover points once hidden", async () => {
    const layer = new ScorerZerosLayer(new THREE.Group(), { loadZeros: () => Promise.resolve(sampleZeros()) });
    layer.setVisible(true);
    await vi.waitFor(() => {
      expect(layer.acceptsHover()).toBe(true);
    });

    layer.setVisible(false);

    expect(layer.acceptsHover()).toBe(false);
    expect(layer.getDisplayedCount()).toBe(0);
    layer.dispose();
  });
});
