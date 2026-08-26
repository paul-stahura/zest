import type { ToolboxSection } from "@/shared/visualization/contracts";

/**
 * Merges toolbox sections from multiple contributors and sorts by `order` (then title).
 */
export function aggregateToolboxSections(sections: ToolboxSection[]): ToolboxSection[] {
  const copy = [...sections];
  copy.sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    if (ao !== bo) {
      return ao - bo;
    }
    return a.title.localeCompare(b.title);
  });
  return copy;
}
