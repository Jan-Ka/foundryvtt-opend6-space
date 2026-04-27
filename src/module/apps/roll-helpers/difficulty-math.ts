/**
 * Pure math helpers extracted from roll-difficulty.ts and roll-execute.ts.
 * No Foundry globals — testable in isolation.
 */

export interface Modifier {
    name?: string;
    value: number;
    pips?: number;
}

export interface DefenseScores {
    dodge: number;
    parry: number;
    block: number;
}

/**
 * Picks the highest defense score among dodge/parry/block.
 * Used by getDifficulty for melee/brawl attack target resolution.
 */
export function selectHighestDefense(scores: DefenseScores): number {
    return Math.max(scores.dodge, scores.parry, scores.block);
}

/**
 * Sums the .value of a list of modifiers. Floors-at-0 not applied — callers
 * must clamp if they want non-negative difficulty.
 */
export function sumModifiers(modifiers: Modifier[]): number {
    return modifiers.reduce((total, m) => total + (+m.value || 0), 0);
}

/**
 * Applies modifier list to a base difficulty. Result is `base + sum(modifiers)`.
 * Negative results are allowed (caller's domain decides if floor is needed).
 */
export function applyDifficultyModifiers(baseDifficulty: number, modifiers: Modifier[]): number {
    return (+baseDifficulty) + sumModifiers(modifiers);
}

/**
 * Enforce the combat difficulty minimum of 3.
 * Rule: "the total combat difficulty may never go below 3" (Book p70).
 */
export function clampCombatDifficulty(difficulty: number): number {
    return Math.max(3, difficulty);
}

/**
 * Applies damage modifiers, optionally excluding a named modifier (used to
 * exclude OD6S.STRENGTH_DAMAGE_BONUS when the actor has fatepointeffect).
 */
export function applyDamageModifiers(
    baseDamage: number,
    modifiers: Modifier[],
    excludeName?: string,
): number {
    let damage = +baseDamage;
    for (const m of modifiers) {
        if (excludeName && m.name === excludeName) continue;
        damage += (+m.value);
    }
    return damage;
}

/**
 * Bucket a measured distance against a weapon's range thresholds and return
 * the range key (and matching difficulty level when map_range_to_difficulty is on).
 *
 * Returns null if distance is out of range (caller should warn the user).
 *
 * Mirrors lines 489-501 of roll-setup.ts.
 */
export interface RangeThresholds {
    short: number;
    medium: number;
    long: number;
}

export interface RangeBucket {
    range: string;
    difficultyLevel: string | null;
}

export function bucketRangeFromDistance(
    distance: number,
    range: RangeThresholds,
    mapRangeToDifficulty: boolean,
): RangeBucket | null {
    if (distance < 3) {
        return {
            range: "OD6S.RANGE_POINT_BLANK_SHORT",
            difficultyLevel: mapRangeToDifficulty ? "OD6S.DIFFICULTY_VERY_EASY" : null,
        };
    }
    if (distance <= range.short) {
        return {
            range: "OD6S.RANGE_SHORT_SHORT",
            difficultyLevel: mapRangeToDifficulty ? "OD6S.DIFFICULTY_EASY" : null,
        };
    }
    if (distance <= range.medium) {
        return {
            range: "OD6S.RANGE_MEDIUM_SHORT",
            difficultyLevel: mapRangeToDifficulty ? "OD6S.DIFFICULTY_MODERATE" : null,
        };
    }
    if (distance <= range.long) {
        return {
            range: "OD6S.RANGE_LONG_SHORT",
            difficultyLevel: mapRangeToDifficulty ? "OD6S.DIFFICULTY_DIFFICULT" : null,
        };
    }
    return null;
}

/**
 * Computes the updated difficulty and success flag after a GM edits the base
 * difficulty on an existing chat-card roll.
 *
 * Formula (edit-difficulty.ts #onSubmit):
 *   diff           = newBase − oldBase
 *   newDifficulty  = oldDiff + diff
 *   success        = rollTotal ≥ newDifficulty
 */
export function computeDifficultyUpdate(
    oldBase: number,
    newBase: number,
    oldDiff: number,
    rollTotal: number,
): { newDifficulty: number; success: boolean } {
    const newDifficulty = oldDiff + (newBase - oldBase);
    return { newDifficulty, success: rollTotal >= newDifficulty };
}

/**
 * Splits a signed bonus modifier into positive bonus dice and a separate
 * penalty-dice value when the score is negative. Mirrors lines 570-574 of
 * roll-setup.ts.
 *
 * Pure given a score-to-dice converter.
 */
export interface BonusSplit {
    bonusDice: number;
    bonusPips: number;
    penaltyDice: number;
}

export function splitBonusForPenalty(
    bonusDice: number,
    bonusPips: number,
    pipsPerDice: number,
): BonusSplit {
    const score = bonusDice * pipsPerDice + bonusPips;
    if (score < 0) {
        return {
            bonusDice: 0,
            bonusPips: 0,
            penaltyDice: bonusDice * -1,
        };
    }
    return { bonusDice, bonusPips, penaltyDice: 0 };
}
