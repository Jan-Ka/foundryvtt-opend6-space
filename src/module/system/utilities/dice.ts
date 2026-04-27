/**
 * Convert a raw score to dice and pips.
 * e.g. score 14 with pipsPerDice 3 → { dice: 4, pips: 2 }
 */
export function getDiceFromScore(score: number, pipsPerDice: number): { dice: number; pips: number } {
    const dice = Math.floor(score / pipsPerDice);
    const pips = score % pipsPerDice;
    return { dice, pips };
}

/**
 * Format a dice object as a display string.
 * e.g. { dice: 4, pips: 2 } → "4D+2"
 */
export function getTextFromDice(dice: { dice: number; pips: number }): string {
    return `${dice.dice}D+${dice.pips}`;
}

/**
 * Convert dice and pips back to a raw score.
 * e.g. dice=4, pips=2, pipsPerDice=3 → 14
 */
export function getScoreFromDice(dice: number, pips: number, pipsPerDice: number): number {
    return (+dice * pipsPerDice) + (+pips);
}
