/**
 * Pure character creation math extracted from character-creation.ts.
 * No Foundry globals — testable in isolation.
 *
 * Conventions:
 *   - skillScore / specScore are pip-budgets the player has left to spend
 *   - "score" is in pips (1 die = pipsPerDice pips)
 *   - Functions return discriminated results; UI layer handles notifications
 */

export interface AllocationConfig {
    pipsPerDice: number;
    specializationDice: boolean;
    specStartingPipsPerDie: number;
    initialSkills: number;
}

export interface ScorePair {
    skillScore: number;
    specScore: number;
}

export type AllocationResult =
    | { ok: true; skillScore: number; specScore: number }
    | { ok: false; reason: 'NOT_ENOUGH_SKILL_DICE' | 'NOT_ENOUGH_SPEC_DICE' | 'AT_INITIAL_LIMIT' | 'BASE_TOO_LOW' };

/**
 * Convert 1 die of skill budget into 3 dice of spec budget.
 * Mirrors `.add-spec-dice` handler.
 */
export function addSpecDiceBudget(
    skillScore: number,
    specScore: number,
    config: AllocationConfig,
): AllocationResult {
    if (skillScore < config.pipsPerDice) {
        return { ok: false, reason: 'NOT_ENOUGH_SKILL_DICE' };
    }
    return {
        ok: true,
        skillScore: skillScore - config.pipsPerDice,
        specScore: specScore + config.pipsPerDice * 3,
    };
}

/**
 * Convert 3 dice of spec budget back into 1 die of skill budget.
 * Mirrors `.remove-spec-dice` handler.
 */
export function removeSpecDiceBudget(
    skillScore: number,
    specScore: number,
    config: AllocationConfig,
): AllocationResult {
    if (specScore < config.pipsPerDice * 3) {
        return { ok: false, reason: 'NOT_ENOUGH_SPEC_DICE' };
    }
    return {
        ok: true,
        skillScore: skillScore + config.pipsPerDice,
        specScore: specScore - config.pipsPerDice * 3,
    };
}

/**
 * Compute new skill score after a +1 base increment.
 * Mirrors `.increase-dialog` handler.
 */
export function applySkillIncrease(
    skillScore: number,
): AllocationResult {
    if (skillScore < 1) {
        return { ok: false, reason: 'NOT_ENOUGH_SKILL_DICE' };
    }
    return { ok: true, skillScore: skillScore - 1, specScore: 0 };
}

/**
 * Compute new skill score after a -1 base decrement. Caller passes the
 * skill's current base — must be > 0. Refund cannot push skillScore over
 * its initial budget.
 * Mirrors `.decrease-dialog` handler.
 */
export function applySkillDecrease(
    skillScore: number,
    currentBase: number,
    initialSkills: number,
): AllocationResult {
    if (skillScore >= initialSkills) {
        return { ok: false, reason: 'AT_INITIAL_LIMIT' };
    }
    if (currentBase < 1) {
        return { ok: false, reason: 'BASE_TOO_LOW' };
    }
    return { ok: true, skillScore: skillScore + 1, specScore: 0 };
}

/**
 * Cost & new score computations when adding a brand-new specialization.
 * - When specScore is 0, the player must spend 1 die of skill budget; the
 *   spec budget jumps to `pipsPerDice * specStartingPipsPerDie - add`.
 * - Otherwise the new spec just costs `add` (which is `pipsPerDice` in
 *   specializationDice mode, else `1`).
 *
 * Mirrors `addSpec()` in character-creation.ts.
 */
export interface AddSpecResult {
    ok: boolean;
    add: number;
    newSpecBase: number;
    skillScore: number;
    specScore: number;
}

export function applyAddSpec(
    skillBase: number,
    skillScore: number,
    specScore: number,
    config: AllocationConfig,
): AddSpecResult {
    const add = config.specializationDice ? config.pipsPerDice : 1;
    const newSpecBase = skillBase + add;

    if (specScore === 0) {
        return {
            ok: true,
            add,
            newSpecBase,
            skillScore: skillScore - config.pipsPerDice,
            specScore: config.pipsPerDice * config.specStartingPipsPerDie - add,
        };
    }
    return {
        ok: true,
        add,
        newSpecBase,
        skillScore,
        specScore: specScore - add,
    };
}

/**
 * Refund spec budget when a specialization item is deleted.
 * Refunds `(specBase - skillBase)` pips. In specializationDice mode, if the
 * refund brings specScore exactly to `pipsPerDice * specStartingPipsPerDie`,
 * we collapse it back into 1 die of skill budget.
 *
 * Mirrors `.spec-delete` handler.
 */
export function applySpecDelete(
    specBase: number,
    skillBase: number,
    skillScore: number,
    specScore: number,
    config: AllocationConfig,
): ScorePair {
    let newSpecScore = specScore + (specBase - skillBase);
    let newSkillScore = skillScore;

    if (config.specializationDice) {
        if (newSpecScore === config.pipsPerDice * config.specStartingPipsPerDie) {
            newSpecScore = 0;
            newSkillScore = newSkillScore + config.pipsPerDice;
        }
    }
    return { skillScore: newSkillScore, specScore: newSpecScore };
}

/**
 * Refund skill budget when a skill item is deleted.
 * Mirrors `.skill-delete` handler.
 */
export function applySkillDelete(
    skillBase: number,
    skillScore: number,
): number {
    return skillScore + skillBase;
}
