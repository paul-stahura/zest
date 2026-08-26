import { parsePointSetCsv } from "@/shared/io/csvPointSet";
import { IoError } from "@/shared/io/errors";

describe("parsePointSetCsv", () => {
  it("parses a minimal two-column CSV", () => {
    const result = parsePointSetCsv("cid", "x,y\n1,2\n3,4\n", "demo.csv");
    expect(result.kind).toBe("pointSet");
    expect(result.points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it("skips blank lines and comment lines", () => {
    const csv = "# header\n\n1,2\n";
    const result = parsePointSetCsv("cid", csv, "demo.csv");
    expect(result.points).toEqual([{ x: 1, y: 2 }]);
  });

  it("throws when no numeric points are found", () => {
    expect(() => parsePointSetCsv("cid", "# only\n", "demo.csv")).toThrow(IoError);
  });
});
