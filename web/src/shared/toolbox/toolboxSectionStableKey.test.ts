import { toolboxSectionStableKey } from "@/shared/toolbox/toolboxSectionStableKey";
import type { ToolboxSection } from "@/shared/visualization/contracts";

describe("toolboxSectionStableKey", () => {
  it("namespaces identical section ids by contributor", () => {
    const a: ToolboxSection = { id: "controls", contributorId: "viz-a", title: "A" };
    const b: ToolboxSection = { id: "controls", contributorId: "viz-b", title: "B" };
    expect(toolboxSectionStableKey(a)).not.toEqual(toolboxSectionStableKey(b));
  });

  it("falls back to a shared namespace when contributorId is omitted", () => {
    const section: ToolboxSection = { id: "controls", title: "C" };
    expect(toolboxSectionStableKey(section)).toBe("global::controls");
  });
});
