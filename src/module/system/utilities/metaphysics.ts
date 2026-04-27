/**
 * Pure metaphysics advancement cost helpers.
 * No Foundry dependency — safe to unit-test in isolation.
 *
 * Rule source: Chapter 14, "Obtaining Access to Metaphysics" (p92).
 */

/**
 * Returns the Character Point cost for the next improvement pip on the
 * Metaphysics attribute.
 *
 * Formula:
 *   - 0D → 1D (initial access): 20 CP flat.
 *   - Any subsequent pip:        10 × currentDice CP.
 *
 * "currentDice" is the number in front of the D *before* the improvement,
 * e.g. 1D = 1, 2D = 2.  Pips within the same die level share the same cost:
 * improving from 1D to 1D+1, from 1D+1 to 1D+2, and from 1D+2 to 2D all
 * cost 10 × 1 = 10 CP.
 *
 * @param currentDice  Number of full dice in the current Metaphysics attribute.
 *                     Pass 0 if the character does not yet have Metaphysics.
 */
export function computeMetaphysicsAttributeCost(currentDice: number): number {
    if (currentDice === 0) return 20;
    return 10 * currentDice;
}
