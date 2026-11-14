import type { Object3D } from "three";

/**
 * True when `node` and every ancestor are visible. A layer can have
 * `visible === true` while a parent group is hidden (Arias solo hides
 * the harvest group this way); those points are not on screen.
 */
export function ancestorChainVisible(node: Object3D): boolean {
  let current: Object3D | null = node;
  while (current !== null) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}
