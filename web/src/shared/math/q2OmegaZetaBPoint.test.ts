import { complex } from "@/shared/math/complex";
import { eulerMaclaurenZeta, indexToImag } from "@/shared/math/zetaEms";
import {
  formatOmegaLiveReadout,
  omegaForZetaBPoint,
  omegaPhaseAdvanceDeg,
  q2OmegaForZetaBPoint,
} from "@/shared/math/q2OmegaZetaBPoint";
import { midPerpProgressionCoeffs } from "@/shared/math/hurwitzMidPerpSearch";
import {
  calcNLinks,
  calculateHurwitzCharacterTarget,
  calculateHurwitzCharacterVectors,
} from "@/shared/math/lFunctionCalculator";
import { distanceToMidpointPerp } from "@/shared/math/hurwitzZetaPerp";
import { hurwitzBisectorLinkNumber, locateHurwitzBisectorCrossing } from "@/shared/math/hurwitzBisectorLink";

describe("formatOmegaLiveReadout", () => {
  it("matches the toolbox compact form", () => {
    expect(formatOmegaLiveReadout(-0.048, -0.999, 266.6)).toBe("ω=-0.048-0.999i 267°");
    expect(formatOmegaLiveReadout(1, 0, 0)).toBe("ω=1.000 0°");
  });
});

describe("q2OmegaForZetaBPoint", () => {
  it("rejects a non-positive index", () => {
    expect(q2OmegaForZetaBPoint(0)).toBeNull();
    expect(q2OmegaForZetaBPoint(Number.NaN)).toBeNull();
  });

  it("keeps |ω|=1 so the H/2 perp contains ζ at T=6.18", () => {
    const T = 6.18;
    const hit = q2OmegaForZetaBPoint(T);
    if (hit === null) throw new Error("no ω");
    expect(hit.abs).toBeCloseTo(1, 12);
    expect(Math.hypot(hit.omega.re, hit.omega.im)).toBeCloseTo(1, 12);
    const t = indexToImag(T, false);
    const s = complex(0.5, t);
    const zeta = eulerMaclaurenZeta(s);
    const H = calculateHurwitzCharacterTarget(midPerpProgressionCoeffs(2, hit.omega), s);
    const dist = distanceToMidpointPerp({ x: zeta.re, y: zeta.im }, { x: H.re, y: H.im });
    if (dist === null) throw new Error("degenerate H");
    expect(dist).toBeLessThan(1e-3);
  });

  it("puts the first-coil b-point on ζ at T=6.18", () => {
    const T = 6.18;
    const hit = q2OmegaForZetaBPoint(T);
    if (hit === null) throw new Error("no ω");
    const t = indexToImag(T, false);
    const s = complex(0.5, t);
    const zeta = eulerMaclaurenZeta(s);
    const coeffs = midPerpProgressionCoeffs(2, hit.omega);
    const H = calculateHurwitzCharacterTarget(coeffs, s);
    const walk = calculateHurwitzCharacterVectors(coeffs, calcNLinks(T, 2), s);
    const cross = locateHurwitzBisectorCrossing(walk.vectors, { x: H.re, y: H.im }, hurwitzBisectorLinkNumber(T, 2));
    if (cross === null) throw new Error("no crossing");
    expect(Math.hypot(cross.point.x - zeta.re, cross.point.y - zeta.im)).toBeLessThan(0.04);
  });
});

describe("omegaForZetaBPoint", () => {
  it("rejects a non-integer period", () => {
    expect(omegaForZetaBPoint(6.18, 1)).toBeNull();
  });

  it("keeps |ω|=1 so the H/2 perp contains ζ at q=3, T=6.18", () => {
    const T = 6.18;
    const hit = omegaForZetaBPoint(T, 3);
    if (hit === null) throw new Error("no ω");
    expect(hit.abs).toBeCloseTo(1, 12);
    const t = indexToImag(T, false);
    const s = complex(0.5, t);
    const zeta = eulerMaclaurenZeta(s);
    const H = calculateHurwitzCharacterTarget(midPerpProgressionCoeffs(3, hit.omega), s);
    const dist = distanceToMidpointPerp({ x: zeta.re, y: zeta.im }, { x: H.re, y: H.im });
    if (dist === null) throw new Error("degenerate H");
    expect(dist).toBeLessThan(1e-3);
  });

  it("tracks ω without the cold-start hops when T moves a little", () => {
    const T0 = 6.18;
    let prevT = T0;
    let prev = omegaForZetaBPoint(T0, 2);
    if (prev === null) throw new Error("no ω");
    let maxStep = 0;
    for (let T = 6.185; T <= 6.2 + 1e-12; T += 0.005) {
      const next = omegaForZetaBPoint(T, 2, { deg: prev.deg, index: prevT, link: prev.link });
      if (next === null) throw new Error("no tracked ω");
      const d = Math.abs(next.deg - prev.deg);
      maxStep = Math.max(maxStep, Math.min(d, 360 - d));
      expect(next.miss).toBeLessThan(0.15);
      prev = next;
      prevT = T;
    }
    expect(maxStep).toBeLessThan(50);
    expect(omegaPhaseAdvanceDeg(T0, T0 + 0.005, 2)).toBeCloseTo(
      -(indexToImag(T0 + 0.005, false) - indexToImag(T0, false)) * Math.log(2) * 180 / Math.PI,
      10,
    );
  });
});
