import { theorem5Rho } from "@/shared/math/zerosOfF/theorem5Rho";

describe("theorem5Rho", () => {
  it("matches the Theorem 5 main terms at N = 100", () => {
    const lower = theorem5Rho(100, 0);
    const upper = theorem5Rho(100, 1);
    if (lower === null || upper === null) throw new Error("expected both resonances");
    expect(lower.sigma).toBeCloseTo(-41.51558299372663, 6);
    expect(lower.t).toBeCloseTo(62986.565877547604, 4);
    expect(upper.sigma).toBeCloseTo(-25.038719960859503, 6);
    expect(upper.t).toBeCloseTo(63615.190843439166, 4);
    expect(lower.sigma).toBeLessThan(upper.sigma);
  });

  it("returns null below N = 1", () => {
    expect(theorem5Rho(0, 0)).toBeNull();
  });
});
