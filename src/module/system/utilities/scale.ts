/**
 * Pure scale-modifier helper extracted from roll-action.ts.
 * No Foundry dependency — safe to unit-test in isolation.
 */

/**
 * Returns the difficulty penalty applied to the defender's resistance roll
 * when the attacker is smaller than the defender.
 *
 * Rule: a smaller attacker faces a harder target because the defender's bulk
 * absorbs the strike. The penalty equals the raw scale difference.
 *
 * When the attacker is the same size or larger, no modifier is applied.
 *
 * @param attackerScale  Scale value of the attacking actor/vehicle.
 * @param defenderScale  Scale value of the defending actor/vehicle.
 * @returns Positive modifier added to the defender's resistance difficulty,
 *          or 0 when attacker ≥ defender.
 */
export function computeScaleModifier(attackerScale: number, defenderScale: number): number {
    if (attackerScale < defenderScale) {
        return defenderScale - attackerScale;
    }
    return 0;
}
