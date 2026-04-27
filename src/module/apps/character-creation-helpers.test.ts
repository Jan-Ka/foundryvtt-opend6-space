import { describe, it, expect } from 'vitest';
import {
    addSpecDiceBudget,
    removeSpecDiceBudget,
    applySkillIncrease,
    applySkillDecrease,
    applyAddSpec,
    applySpecDelete,
    applySkillDelete,
    type AllocationConfig,
} from './character-creation-helpers';

const config: AllocationConfig = {
    pipsPerDice: 3,
    specializationDice: false,
    specStartingPipsPerDie: 3,
    initialSkills: 21,
};

const diceConfig: AllocationConfig = {
    ...config,
    specializationDice: true,
};

describe('addSpecDiceBudget', () => {
    it('moves 3 pips from skill to spec (gains 9 spec pips)', () => {
        // 1 die of skill (3 pips) → 3 dice of spec budget (9 pips)
        expect(addSpecDiceBudget(21, 0, config)).toEqual({
            ok: true,
            skillScore: 18,
            specScore: 9,
        });
    });

    it('rejects when skill budget is below pipsPerDice', () => {
        expect(addSpecDiceBudget(2, 0, config)).toEqual({
            ok: false,
            reason: 'NOT_ENOUGH_SKILL_DICE',
        });
    });

    it('exact threshold succeeds', () => {
        expect(addSpecDiceBudget(3, 5, config)).toEqual({
            ok: true,
            skillScore: 0,
            specScore: 14,
        });
    });
});

describe('removeSpecDiceBudget', () => {
    it('moves 9 pips back from spec to skill', () => {
        expect(removeSpecDiceBudget(18, 9, config)).toEqual({
            ok: true,
            skillScore: 21,
            specScore: 0,
        });
    });

    it('rejects when spec budget is below 3*pipsPerDice', () => {
        expect(removeSpecDiceBudget(0, 8, config)).toEqual({
            ok: false,
            reason: 'NOT_ENOUGH_SPEC_DICE',
        });
    });

    it('add then remove is identity', () => {
        const after = addSpecDiceBudget(21, 0, config);
        expect(after.ok).toBe(true);
        if (!after.ok) return;
        const back = removeSpecDiceBudget(after.skillScore, after.specScore, config);
        expect(back).toEqual({ ok: true, skillScore: 21, specScore: 0 });
    });
});

describe('applySkillIncrease', () => {
    it('decrements skillScore by 1', () => {
        expect(applySkillIncrease(21)).toEqual({
            ok: true,
            skillScore: 20,
            specScore: 0,
        });
    });

    it('rejects when skillScore is 0', () => {
        expect(applySkillIncrease(0)).toEqual({
            ok: false,
            reason: 'NOT_ENOUGH_SKILL_DICE',
        });
    });

    it('exact threshold of 1 succeeds', () => {
        expect(applySkillIncrease(1)).toEqual({
            ok: true,
            skillScore: 0,
            specScore: 0,
        });
    });
});

describe('applySkillDecrease', () => {
    it('refunds 1 to skillScore', () => {
        expect(applySkillDecrease(15, 5, 21)).toEqual({
            ok: true,
            skillScore: 16,
            specScore: 0,
        });
    });

    it('rejects when at initial limit', () => {
        expect(applySkillDecrease(21, 5, 21)).toEqual({
            ok: false,
            reason: 'AT_INITIAL_LIMIT',
        });
    });

    it('rejects when skill base is 0', () => {
        expect(applySkillDecrease(15, 0, 21)).toEqual({
            ok: false,
            reason: 'BASE_TOO_LOW',
        });
    });
});

describe('applyAddSpec', () => {
    describe('pip mode (specializationDice=false)', () => {
        it('first spec for a skill: spends 1 die of skill, sets spec budget', () => {
            const result = applyAddSpec(5, 21, 0, config);
            // add = 1 (pip), newSpecBase = 5+1 = 6
            // Spec budget jumps to 3*3 - 1 = 8, skillScore -= 3
            expect(result).toEqual({
                ok: true,
                add: 1,
                newSpecBase: 6,
                skillScore: 18,
                specScore: 8,
            });
        });

        it('subsequent spec costs 1 pip from spec budget', () => {
            const result = applyAddSpec(5, 18, 8, config);
            expect(result).toEqual({
                ok: true,
                add: 1,
                newSpecBase: 6,
                skillScore: 18,
                specScore: 7,
            });
        });
    });

    describe('dice mode (specializationDice=true)', () => {
        it('first spec: add = pipsPerDice, spec budget jumps', () => {
            const result = applyAddSpec(5, 21, 0, diceConfig);
            // add = 3, newSpecBase = 5+3 = 8
            // Spec budget = 3*3 - 3 = 6, skillScore -= 3
            expect(result).toEqual({
                ok: true,
                add: 3,
                newSpecBase: 8,
                skillScore: 18,
                specScore: 6,
            });
        });

        it('subsequent spec costs pipsPerDice from spec budget', () => {
            const result = applyAddSpec(5, 18, 6, diceConfig);
            expect(result).toEqual({
                ok: true,
                add: 3,
                newSpecBase: 8,
                skillScore: 18,
                specScore: 3,
            });
        });
    });
});

describe('applySpecDelete', () => {
    it('refunds (specBase - skillBase) to spec budget', () => {
        // Spec at base 7, derived from skill at base 5 → refund 2
        expect(applySpecDelete(7, 5, 18, 5, config)).toEqual({
            skillScore: 18,
            specScore: 7,
        });
    });

    it('dice mode: refund landing exactly at full collapses to skill budget', () => {
        // Spec at base 8 from skill at base 5 → refund 3 → specScore 9 (= 3*3)
        // With specializationDice on, this becomes specScore=0 + skillScore +=3
        expect(applySpecDelete(8, 5, 18, 6, diceConfig)).toEqual({
            skillScore: 21,
            specScore: 0,
        });
    });

    it('dice mode: refund landing below full does not collapse', () => {
        // Spec at base 6 from skill at base 5 → refund 1 → specScore 4
        expect(applySpecDelete(6, 5, 18, 3, diceConfig)).toEqual({
            skillScore: 18,
            specScore: 4,
        });
    });

    it('pip mode never collapses', () => {
        // Spec at base 8 from skill at 5 → refund 3 → specScore 9 in pip mode
        expect(applySpecDelete(8, 5, 18, 6, config)).toEqual({
            skillScore: 18,
            specScore: 9,
        });
    });
});

describe('applySkillDelete', () => {
    it('refunds full skill base to skill budget', () => {
        expect(applySkillDelete(7, 14)).toBe(21);
    });

    it('refunds 0 when skill base is 0', () => {
        expect(applySkillDelete(0, 14)).toBe(14);
    });
});
