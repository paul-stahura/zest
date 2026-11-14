import {
  BIG_SIGMA_VIEW_TARGET_RADIUS,
  bigSigmaWorldScale,
  clampLastLinksCount,
  computeBigSigmaGeometry,
  computeForwardSumJoints,
  lastLinkJoints,
  recenterPointsToFirst,
  computeScaledForwardSumJoints,
  computeScaledRak1,
  computeScaledRps1,
  pointsMaxRadius,
  scalePoints,
} from "@/shared/math/bigSigmaSpiral";
import { calcForwardSum, calcRak1, calcRps1 } from "@/shared/math/sumRemainders";

describe("computeForwardSumJoints", () => {
  it("starts at the origin and ends at calcForwardSum", () => {
    const joints = computeForwardSumJoints(0.5, 6.18);
    expect(joints[0]).toEqual({ x: 0, y: 0 });
    const last = joints.at(-1)!;
    const sum = calcForwardSum(0.5, 6.18);
    expect(last.x).toBeCloseTo(sum.re, 12);
    expect(last.y).toBeCloseTo(sum.im, 12);
    expect(joints).toHaveLength(Math.floor(6.18) + 1);
  });
});

describe("computeBigSigmaGeometry", () => {
  it("puts the R1ak tip at scaled Σ₁ + scaled R1ak, matching T^σ times the unscaled pair", () => {
    const geom = computeBigSigmaGeometry(0.5, 6.18);
    const sum = calcForwardSum(0.5, 6.18);
    const r1 = calcRak1(0.5, 6.18);
    const Tsigma = Math.pow(6.18, 0.5);
    expect(geom.fApprox.x).toBeCloseTo((sum.re + r1.re) * Tsigma, 8);
    expect(geom.fApprox.y).toBeCloseTo((sum.im + r1.im) * Tsigma, 8);
  });

  it("keeps Σ₁ and R1ak finite at the overflow (σ, T) that used to drop the red line", () => {
    const geom = computeBigSigmaGeometry(-127.32642449797814, 445.564311, "floorT");
    expect(geom.joints.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(Number.isFinite(geom.sum1.x) && Number.isFinite(geom.sum1.y)).toBe(true);
    expect(Number.isFinite(geom.fApprox.x) && Number.isFinite(geom.fApprox.y)).toBe(true);
    const rLen = Math.hypot(geom.fApprox.x - geom.sum1.x, geom.fApprox.y - geom.sum1.y);
    expect(rLen).toBeGreaterThan(1e-12);
  });

  it("last-n keeps only Σ₁ tail links and still pins R1ak to that tip", () => {
    const full = computeBigSigmaGeometry(0.5, 6.18, "floorT");
    const last2 = computeBigSigmaGeometry(0.5, 6.18, "entire", 2);
    expect(last2.joints).toHaveLength(3);
    const raw = lastLinkJoints(full.joints, 2);
    expect(last2.joints[0]).toEqual({ x: 0, y: 0 });
    expect(last2.joints[1]!.x).toBeCloseTo(raw[1]!.x - raw[0]!.x, 12);
    expect(last2.joints[2]!.x).toBeCloseTo(raw[2]!.x - raw[0]!.x, 12);
    expect(last2.sum1.x).toBeCloseTo(last2.joints[2]!.x, 12);
    expect(last2.sum1.y).toBeCloseTo(last2.joints[2]!.y, 12);
    const rFull = Math.hypot(full.fApprox.x - full.sum1.x, full.fApprox.y - full.sum1.y);
    const rLast = Math.hypot(last2.fApprox.x - last2.sum1.x, last2.fApprox.y - last2.sum1.y);
    expect(rLast).toBeCloseTo(rFull, 12);
  });

  it("pins the white tip to Σ₁ + R1ps when that remainder is selected", () => {
    const geom = computeBigSigmaGeometry(0.5, 6.18, "floorT", null, "ps");
    const sum = calcForwardSum(0.5, 6.18);
    const r1 = calcRps1(0.5, 6.18);
    const Tsigma = Math.pow(6.18, 0.5);
    expect(geom.fApprox.x).toBeCloseTo((sum.re + r1.re) * Tsigma, 6);
    expect(geom.fApprox.y).toBeCloseTo((sum.im + r1.im) * Tsigma, 6);
    const ak = computeBigSigmaGeometry(0.5, 6.18);
    expect(Math.hypot(geom.fApprox.x - ak.fApprox.x, geom.fApprox.y - ak.fApprox.y)).toBeGreaterThan(1e-6);
  });

  it("entire chain has more joints than ⌊T⌋, and still pins R1ak to Σ₁", () => {
    const floorGeom = computeBigSigmaGeometry(0.5, 6.18, "floorT");
    const entire = computeBigSigmaGeometry(0.5, 6.18, "entire");
    expect(entire.joints.length).toBeGreaterThan(floorGeom.joints.length);
    expect(entire.sum1.x).toBeCloseTo(floorGeom.sum1.x, 12);
    expect(entire.sum1.y).toBeCloseTo(floorGeom.sum1.y, 12);
  });
});

describe("lastLinkJoints", () => {
  it("takes the last n segments and clamps the count", () => {
    const joints = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(lastLinkJoints(joints, 2)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(lastLinkJoints(joints, 99)).toEqual(joints);
    expect(clampLastLinksCount(0)).toBe(1);
    expect(clampLastLinksCount(10.4)).toBe(10);
    expect(recenterPointsToFirst([{ x: 4, y: 1 }, { x: 5, y: 1 }])).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });
});

describe("bigSigmaWorldScale", () => {
  it("leaves a unit-sized spiral alone and shrinks a huge radius when σ ≤ −1", () => {
    expect(bigSigmaWorldScale(-50, 1)).toBe(1);
    expect(bigSigmaWorldScale(-50, BIG_SIGMA_VIEW_TARGET_RADIUS)).toBe(1);
    const huge = 1e20;
    expect(bigSigmaWorldScale(-50, huge)).toBeCloseTo(BIG_SIGMA_VIEW_TARGET_RADIUS / huge, 12);
    expect(bigSigmaWorldScale(-1, huge)).toBeCloseTo(BIG_SIGMA_VIEW_TARGET_RADIUS / huge, 12);
  });

  it("does not auto-fit when σ is above −1", () => {
    expect(bigSigmaWorldScale(-0.999, 1e20)).toBe(1);
    expect(bigSigmaWorldScale(0.5, 1e20)).toBe(1);
  });

  it("scales every joint about the origin", () => {
    const pts = scalePoints([{ x: 2, y: 0 }, { x: 0, y: -4 }], 0.5);
    expect(pts).toEqual([{ x: 1, y: 0 }, { x: 0, y: -2 }]);
  });

  it("ignores non-finite points when measuring radius", () => {
    expect(pointsMaxRadius([{ x: Infinity, y: 0 }, { x: 3, y: 4 }])).toBe(5);
  });

  it("fits a large-negative-σ chain inside the default window", () => {
    const geom = computeBigSigmaGeometry(-127.32642449797814, 445.564311, "floorT");
    const raw = pointsMaxRadius([...geom.joints, geom.fApprox]);
    expect(raw).toBeGreaterThan(0);
    const scale = bigSigmaWorldScale(-127.32642449797814, raw);
    const drawn = pointsMaxRadius(scalePoints([...geom.joints, geom.fApprox], scale));
    expect(drawn).toBeLessThanOrEqual(BIG_SIGMA_VIEW_TARGET_RADIUS + 1e-9);
  });
});

describe("T^σ scaled walk", () => {
  it("matches T^σ times the unscaled Σ₁ and R1ak at mild σ", () => {
    const T = 6.18;
    const sigma = 0.5;
    const Tsigma = Math.pow(T, sigma);
    const joints = computeScaledForwardSumJoints(sigma, T);
    const last = joints.at(-1)!;
    const sum = calcForwardSum(sigma, T);
    expect(last.x).toBeCloseTo(sum.re * Tsigma, 8);
    expect(last.y).toBeCloseTo(sum.im * Tsigma, 8);
    const r1 = computeScaledRak1(sigma, T);
    const raw = calcRak1(sigma, T);
    expect(r1.x).toBeCloseTo(raw.re * Tsigma, 8);
    expect(r1.y).toBeCloseTo(raw.im * Tsigma, 8);
    const rps = computeScaledRps1(sigma, T);
    const rawPs = calcRps1(sigma, T);
    expect(rps.x).toBeCloseTo(rawPs.re * Tsigma, 6);
    expect(rps.y).toBeCloseTo(rawPs.im * Tsigma, 6);
  });
});
