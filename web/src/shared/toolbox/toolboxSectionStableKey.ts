import type { ToolboxSection } from "@/shared/visualization/contracts";

/**
 * Stable React/collapse key for a toolbox section so distinct contributors cannot collide on `section.id` alone.
 */
export function toolboxSectionStableKey(section: ToolboxSection): string {
  const contributor = section.contributorId ?? "global";
  return `${contributor}::${section.id}`;
}
