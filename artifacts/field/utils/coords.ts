/**
 * Normalise a stored coordinate value to a fraction in [0, 1] relative to
 * the blueprint image's display dimension.
 *
 * The backend stores segment x/y/width/height as PERCENTAGE values (0–100).
 * Confirmed against live API data: e.g. { x: 10, y: 20, width: 50, height: 8 }.
 *
 * This utility is deliberately robust to both storage formats:
 *   - Percentage values (> 1):  divided by 100 → fraction
 *   - Fraction values  (≤ 1):  used as-is
 *
 * To convert to a pixel offset, multiply the returned fraction by the
 * relevant display dimension:
 *   const leftPx = pctFraction(seg.x) * displayWidth;
 */
export function pctFraction(value: number): number {
  return value > 1 ? value / 100 : value;
}
