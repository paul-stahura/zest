import { complex, complexArg } from "@/shared/math/complex";
import { riemannSiegelTheta } from "@/shared/math/riemannSiegelTheta";
import { eulerMaclaurenZeta } from "@/shared/math/zetaEms";

describe("riemannSiegelTheta", () => {
  it("is zero at t = 0 and odd", () => {
    expect(riemannSiegelTheta(0)).toBe(0);
    expect(riemannSiegelTheta(-14)).toBeCloseTo(-riemannSiegelTheta(14), 12);
  });

  it("matches log-gamma reference values", () => {
    const cases: { t: number; theta: number }[] = [
      { t: 1, theta: -1.76754795281229039 },
      { t: 14.134725141734694, theta: -1.72867024667583783 },
      { t: 100, theta: 87.97216523178722 },
      { t: 1000, theta: 2034.5464280380316 },
    ];
    for (const { t, theta } of cases) {
      expect(riemannSiegelTheta(t)).toBeCloseTo(theta, 8);
    }
  });

  it("rotates critical-line zeta onto the real axis", () => {
    const t = 20;
    const zeta = eulerMaclaurenZeta(complex(0.5, t));
    const turned = complexArg(zeta) + riemannSiegelTheta(t);
    const imagAfter = Math.sin(turned) * Math.hypot(zeta.re, zeta.im);
    expect(Math.abs(imagAfter)).toBeLessThan(1e-8);
  });
});
