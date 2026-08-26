import { describe, expect, it } from "vitest";

import { planJointAngleSamples } from "@/features/joint-angles/jointAnglesDecimation";
import { buildJointAnglePlotPoints, plotPointsToInterleavedCss } from "@/features/joint-angles/jointAnglesRenderPoints";
import { jaSignedPerturbWindow } from "@/shared/math/jointAngleVector";

function benchMs(fn: () => void, reps: number): number {
  for (let i = 0; i < 5; i += 1) fn();
  const t0 = performance.now();
  for (let i = 0; i < reps; i += 1) fn();
  return (performance.now() - t0) / reps;
}

describe("joint angles render bench", () => {
  it("full visible joint count at N=50k stays interactive", () => {
    const N = 50_000;
    const index = N + 0.37;
    const nLo = 2;
    const nHi = N;
    const plan = planJointAngleSamples(nLo, nHi);
    expect(plan.joints.length).toBe(N - 1);

    const buf = new Float64Array(nHi + 1);
    const evalMs = benchMs(() => {
      jaSignedPerturbWindow(index, nLo, nHi, false, buf);
    }, 10);

    const PLOT_W = 960;
    const uOf = (n: number): number => (n - 1) / (N - 1);
    const xOfU = (u: number): number => 40 + u * PLOT_W;
    const buildMs = benchMs(() => {
      const pts = buildJointAnglePlotPoints({
        joints: plan.joints,
        signed: buf,
        uOf,
        xOfU,
        plotTop: 40,
        plotHeight: 400,
        plotLeft: 40,
        plotRight: 40 + PLOT_W,
      });
      plotPointsToInterleavedCss(pts);
    }, 5);

    expect(plan.joints.length).toBeGreaterThan(25_000);
    expect(evalMs + buildMs).toBeLessThan(500);
    // eslint-disable-next-line no-console -- intentional bench output
    console.log(
      `[bench] N=${N} joints=${plan.joints.length} eval=${evalMs.toFixed(2)}ms build=${buildMs.toFixed(2)}ms`,
    );
  });
});
