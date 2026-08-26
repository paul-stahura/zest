import { describe, expect, it } from "vitest";

import { jointAngleDotRadiusCss, planJointAngleSamples } from "@/features/joint-angles/jointAnglesDecimation";

describe("planJointAngleSamples", () => {
  it("returns every visible joint without decimation", () => {
    const plan = planJointAngleSamples(2, 100);
    expect(plan.joints.length).toBe(99);
    expect(plan.joints[0]).toBe(2);
    expect(plan.joints[plan.joints.length - 1]).toBe(100);
  });

  it("includes all joints at large N (no display LOD cliff)", () => {
    const plan = planJointAngleSamples(2, 500_000);
    expect(plan.joints.length).toBe(499_999);
    expect(plan.joints[plan.joints.length - 1]).toBe(500_000);
  });

  it("handles a narrow zoom window", () => {
    const plan = planJointAngleSamples(20_000, 20_500);
    expect(plan.joints.length).toBe(501);
    expect(plan.joints[0]).toBe(20_000);
  });
});

describe("jointAngleDotRadiusCss", () => {
  it("uses wider dots when rendered count is below plot width", () => {
    expect(jointAngleDotRadiusCss(800, 400, 0)).toBeGreaterThan(1);
  });

  it("uses minimum dot size when joints are denser than pixels", () => {
    expect(jointAngleDotRadiusCss(800, 80_000, 0)).toBeGreaterThanOrEqual(0.5);
  });

  it("shrinks dots when dim slider is high", () => {
    expect(jointAngleDotRadiusCss(800, 400, 0.8)).toBeLessThan(jointAngleDotRadiusCss(800, 400, 0));
  });
});
