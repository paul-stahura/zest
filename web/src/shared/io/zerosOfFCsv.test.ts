import { describe, it, expect } from "vitest";
import { exportZerosOfFCsv, parseZerosOfFCsv } from "@/shared/io/zerosOfFCsv";
import { IoError } from "@/shared/io/errors";

describe("parseZerosOfFCsv", () => {
  it("parses Python-format CSV with comment header and level column", () => {
    const csv = `# tmax=600  sigma_min=-30  sigma_max=-1
sigma,T,y_val,level
-30,14.2345,0.000432,red
-30,27.8812,1.8e-07,black
-30,42.1100,0.000210,phase
-30,55.9901,0.000180,magnitude
`;
    const out = parseZerosOfFCsv("c1", csv, "test.csv");
    expect(out.label).toBe("test.csv");
    expect(out.meta).toEqual({ tmax: "600", sigma_min: "-30", sigma_max: "-1" });
    expect(out.sigma).toEqual([-30, -30, -30, -30]);
    expect(out.t).toEqual([14.2345, 27.8812, 42.11, 55.9901]);
    expect(out.yVal[1]).toBeCloseTo(1.8e-7, 12);
    expect(out.level).toEqual([1, 2, 4, 3]);
  });

  it("parses CSV without level column", () => {
    const csv = `sigma,T,y_val
-20,1.5,0.001
-20,2.5,0.002
`;
    const out = parseZerosOfFCsv("c1", csv, "x.csv");
    expect(out.level).toBeNull();
    expect(out.yVal).toEqual([0.001, 0.002]);
  });

  it("rejects malformed header", () => {
    expect(() => parseZerosOfFCsv("c1", "x,y\n1,2\n", "x")).toThrow(IoError);
  });

  it("rejects missing header", () => {
    expect(() => parseZerosOfFCsv("c1", "", "x")).toThrow(IoError);
  });
});

describe("exportZerosOfFCsv", () => {
  it("round-trips with parser when level column included", () => {
    const text = exportZerosOfFCsv({
      meta: { tmax: 600, sigma_min: -30 },
      sigma: [-30, -30],
      t: [14.2345, 27.8812],
      yVal: [0.000432, 1.8e-7],
      level: [1, 2],
    });
    const back = parseZerosOfFCsv("c1", text, "rt.csv");
    expect(back.sigma).toEqual([-30, -30]);
    expect(back.t).toEqual([14.2345, 27.8812]);
    expect(back.yVal[0]).toBeCloseTo(0.000432, 12);
    expect(back.level).toEqual([1, 2]);
    expect(back.meta).toEqual({ tmax: "600", sigma_min: "-30" });
  });

  it("omits level column when not provided", () => {
    const text = exportZerosOfFCsv({
      meta: {},
      sigma: [-1],
      t: [1.5],
      yVal: [0.1],
    });
    expect(text.split("\n")[0]).toBe("sigma,T,y_val");
  });
});
