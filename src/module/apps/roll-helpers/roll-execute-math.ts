/**
 * Pure math helpers extracted from roll-execute.ts. No Foundry globals.
 * Lets tests import without dragging in Roll/Dialog/etc.
 */

export interface HighHitDamageInput {
    /** Final roll total. */
    rollTotal: number;
    /** Difficulty the roll was measured against. */
    difficulty: number;
    /** Setting: how much excess success per damage step (OD6S.highHitDamageMultiplier). */
    multiplier: number;
    /** Setting: round-down (true) vs round-up (false). */
    roundDown: boolean;
    /** Setting: emit as pips (true) vs whole damage dice (false). */
    asPips: boolean;
}

export interface HighHitDamageResult {
    /** Extra damage value to push as a damage modifier. */
    extra: number;
    /** Whether the result should be applied as pips (true) or dice (false). */
    asPips: boolean;
}

/**
 * Compute the high-hit damage bonus when a roll exceeds its difficulty.
 * Returns { extra: 0 } when the roll fails — caller should still skip applying.
 */
export function computeHighHitDamage(input: HighHitDamageInput): HighHitDamageResult {
    const { rollTotal, difficulty, multiplier, roundDown, asPips } = input;
    const difference = rollTotal - difficulty;
    if (difference <= 0 || multiplier <= 0) return { extra: 0, asPips };
    const extra = roundDown
        ? Math.floor(difference / multiplier)
        : Math.ceil(difference / multiplier);
    return { extra, asPips };
}

export interface DieResult {
    result: number;
    active: boolean;
    discarded?: boolean;
}

export interface WildDieReductionResult {
    /** Index of the die to discard (the highest-rolling base die). */
    discardedIndex: number;
    /** New roll total after discarding the highest base die and subtracting 1 (the wild die's natural 1). */
    newTotal: number;
}

/**
 * When the wild die rolls a 1 and the configured outcome is "discard highest base die",
 * find which base die to drop and compute the adjusted total.
 *
 * The original total is reduced by the discarded die's value plus 1 (representing the
 * wild die's own 1 that triggered this path).
 */
export function computeWildDieReduction(
    baseDieResults: DieResult[],
    originalTotal: number,
): WildDieReductionResult {
    let highest = 0;
    for (let i = 0; i < baseDieResults.length; i++) {
        if (baseDieResults[i].result > baseDieResults[highest].result) {
            highest = i;
        }
    }
    const newTotal = originalTotal - baseDieResults[highest].result - 1;
    return { discardedIndex: highest, newTotal };
}
