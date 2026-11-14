import { spiralMiddleIndex } from "@/shared/math/zetaEms";
import { computeZPrimeSpiralGeometry } from "@/shared/math/spiralVariants";

describe("computeZPrimeSpiralGeometry", () => {
  it("keeps the Z′ endpoint continuous when spiralMiddleIndex crosses an integer", () => {
    // T ≈ 6.177 is the first integer crossing of spiralMiddleIndex above 6.
    let tLo = 6.17;
    let tHi = 6.18;
    for (let i = 0; i < 40; i++) {
      const mid = (tLo + tHi) / 2;
      if (spiralMiddleIndex(mid, 0) < 88) tLo = mid;
      else tHi = mid;
    }
    const below = computeZPrimeSpiralGeometry(0.5, tLo, false);
    const above = computeZPrimeSpiralGeometry(0.5, tHi, false);
    const a = below.joints[below.joints.length - 1]!;
    const b = above.joints[above.joints.length - 1]!;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.02);
  });
});
