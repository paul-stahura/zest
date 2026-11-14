import { fracTSpectrumHex } from "@/features/zeros-of-f/fracToHue";
import { BIG_SIGMA_LINK_CONTROL_COLOR, bigSigmaLinkColor } from "@/features/big-sigma/bigSigmaLinkColor";

describe("bigSigmaLinkColor", () => {
  it("keeps cyan when σ, T came from the controls", () => {
    expect(bigSigmaLinkColor(false, 445.564311)).toBe(BIG_SIGMA_LINK_CONTROL_COLOR);
  });

  it("matches the zero spectrum when the input is a picked zero", () => {
    expect(bigSigmaLinkColor(true, 896.028102)).toBe(fracTSpectrumHex(896.028102 - Math.floor(896.028102)));
    expect(bigSigmaLinkColor(true, 100)).toBe(fracTSpectrumHex(0));
  });
});
