/**
 * Normalise a stored segment coordinate to a [0, 1] fraction.
 * Values > 1 are treated as percentages (0–100); values ≤ 1 are used as-is.
 */
export function pctFraction(value: number): number {
  return value > 1 ? value / 100 : value;
}
