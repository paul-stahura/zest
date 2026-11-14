import { encodeCommittedScanBin, parseCommittedScanBin } from "@/shared/io/committedScanBin";

describe("parseCommittedScanBin", () => {
  it("reads little-endian ZOF1 points", () => {
    const count = 2;
    const buffer = new ArrayBuffer(8 + count * 8 * 3);
    const header = new DataView(buffer);
    header.setUint32(0, 0x31464f5a, true);
    header.setUint32(4, count, true);
    const body = new Float64Array(buffer, 8);
    body[0] = -100;
    body[1] = -50;
    body[2] = 10;
    body[3] = 20;
    body[4] = 0.001;
    body[5] = 0.002;
    const parsed = parseCommittedScanBin(buffer);
    expect(Array.from(parsed.sigma)).toEqual([-100, -50]);
    expect(Array.from(parsed.t)).toEqual([10, 20]);
    expect(Array.from(parsed.yVal)).toEqual([0.001, 0.002]);
  });

  it("round-trips through encodeCommittedScanBin", () => {
    const points = {
      sigma: new Float64Array([-400, -50]),
      t: new Float64Array([2.5, 4000]),
      yVal: new Float64Array([1e-6, 2e-6]),
    };
    const parsed = parseCommittedScanBin(encodeCommittedScanBin(points));
    expect(Array.from(parsed.sigma)).toEqual([-400, -50]);
    expect(Array.from(parsed.t)).toEqual([2.5, 4000]);
    expect(Array.from(parsed.yVal)).toEqual([1e-6, 2e-6]);
  });

  it("rejects a truncated buffer", () => {
    expect(() => parseCommittedScanBin(new ArrayBuffer(4))).toThrow("too short");
  });
});
