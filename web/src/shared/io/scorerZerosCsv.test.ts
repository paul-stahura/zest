import { parseScorerZerosCsv, type ScorerZeros } from "@/shared/io/scorerZerosCsv";

const SAMPLE = [
  "# Left-most Scorer zeros",
  "",
  "N,nu,sigma,t,T,residual",
  "130,0,-50.11718892117043,106406.04339568276,129.63504952523365,5.0e-14",
  "249,1,-50.04,390000.1,249.154,6.4e-12",
  "131,0,-50.219814683364525,108048.2970480787,130.63544105816538,3.4e-14",
].join("\n");

describe("parseScorerZerosCsv", () => {
  it("splits rows by resonance and keeps σ and index T", () => {
    const parsed: ScorerZeros = parseScorerZerosCsv(SAMPLE);
    expect(Array.from(parsed.nu0.sigma)).toEqual([-50.11718892117043, -50.219814683364525]);
    expect(Array.from(parsed.nu0.indexT)).toEqual([129.63504952523365, 130.63544105816538]);
    expect(Array.from(parsed.nu1.sigma)).toEqual([-50.04]);
    expect(Array.from(parsed.nu1.indexT)).toEqual([249.154]);
  });

  it("finds the columns by name, whatever their order", () => {
    const parsed = parseScorerZerosCsv("T,sigma,nu\r\n300.16,-58.96,1\r\n");
    expect(Array.from(parsed.nu1.sigma)).toEqual([-58.96]);
    expect(Array.from(parsed.nu1.indexT)).toEqual([300.16]);
    expect(parsed.nu0.sigma.length).toBe(0);
  });

  it("rejects a header without a T column", () => {
    expect(() => parseScorerZerosCsv("N,nu,sigma,t\n1,0,-50,1000\n")).toThrow('missing "T"');
  });

  it("rejects a resonance other than 0 or 1, including a blank one", () => {
    expect(() => parseScorerZerosCsv("nu,sigma,T\n2,-50,130\n")).toThrow("line 2: nu must be 0 or 1");
    expect(() => parseScorerZerosCsv("nu,sigma,T\n,-50,130\n")).toThrow("line 2: nu must be 0 or 1");
  });

  it("rejects a row whose σ or T is not a usable number", () => {
    expect(() => parseScorerZerosCsv("nu,sigma,T\n0,nan,130\n")).toThrow("sigma is not a number");
    expect(() => parseScorerZerosCsv("nu,sigma,T\n0,-50,0\n")).toThrow("T must be a positive number");
  });

  it("rejects text with no header row", () => {
    expect(() => parseScorerZerosCsv("# only a comment\n")).toThrow("no header row");
  });
});
