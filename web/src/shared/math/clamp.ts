/**
 * Clamps a numeric value to an inclusive range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return clamp(value, max, min);
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
