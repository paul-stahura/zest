import { aggregateToolboxSections } from "@/shared/toolbox/aggregateToolboxSections";
import type { ToolboxSection } from "@/shared/visualization/contracts";

describe("aggregateToolboxSections", () => {
  it("sorts sections by order then title", () => {
    const sections: ToolboxSection[] = [
      { id: "b", title: "B", order: 20 },
      { id: "a", title: "A", order: 10 },
      { id: "c", title: "C", order: 10 },
    ];

    const sorted = aggregateToolboxSections(sections);
    expect(sorted.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });
});
