import { describe, it, expect } from 'vitest';
import { computePenalties, isPenaltyBypassType, resolveSkillBackedAction } from './action-math';

const attributes = {
    agi: { score: 9 },
    str: { score: 12 },
    mec: { score: 6 },
};

describe('resolveSkillBackedAction', () => {
    it('skill present + flat-skills: score = attribute, flatPips = skill.score', () => {
        const result = resolveSkillBackedAction({
            skill: { score: 4, attributeKey: 'agi' },
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        });
        expect(result).toEqual({ score: 9, flatPips: 4 });
    });

    it('skill present + non-flat: score = skill.score + attribute, no flatPips', () => {
        const result = resolveSkillBackedAction({
            skill: { score: 4, attributeKey: 'str' },
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'agi',
        });
        expect(result).toEqual({ score: 16 });
        expect(result.flatPips).toBeUndefined();
    });

    it('skill missing: falls back to the requested attribute (melee → agi)', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        })).toEqual({ score: 9 });
    });

    it('skill missing: falls back to brawl attribute (mec)', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'mec',
        })).toEqual({ score: 6 });
    });

    it('returns 0 when the skill points to an unknown attribute key', () => {
        expect(resolveSkillBackedAction({
            skill: { score: 5, attributeKey: 'unknown' },
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        })).toEqual({ score: 0, flatPips: 5 });
    });

    it('returns 0 when the fallback attribute is not present', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'wis',
        })).toEqual({ score: 0 });
    });
});

describe('isPenaltyBypassType', () => {
    it.each([
        'mortally_wounded',
        'incapacitated',
        'damage',
        'resistance',
        'funds',
        'purchase',
    ])('returns true for %s', (rollType) => {
        expect(isPenaltyBypassType(rollType)).toBe(true);
    });

    it.each(['skill', 'specialization', 'attribute', 'weapon', ''])(
        'returns false for %s',
        (rollType) => {
            expect(isPenaltyBypassType(rollType)).toBe(false);
        },
    );
});

describe('computePenalties', () => {
    it('zeros all penalties and flags bypass for damage rolls', () => {
        expect(computePenalties({
            rollType: 'damage',
            actionItemCount: 3,
            stunsCurrent: 2,
            woundPenalty: 5,
        })).toEqual({
            woundPenalty: 0,
            actionPenalty: 0,
            stunnedPenalty: 0,
            isBypass: true,
        });
    });

    it('passes wound penalty through for normal rolls', () => {
        expect(computePenalties({
            rollType: 'skill',
            actionItemCount: 1,
            stunsCurrent: 0,
            woundPenalty: 3,
        }).woundPenalty).toBe(3);
    });

    it('subtracts one free action from the action item count', () => {
        expect(computePenalties({
            rollType: 'skill',
            actionItemCount: 4,
            stunsCurrent: 0,
            woundPenalty: 0,
        }).actionPenalty).toBe(3);
    });

    it('action penalty floors at 0 when no actions are tracked', () => {
        expect(computePenalties({
            rollType: 'skill',
            actionItemCount: 0,
            stunsCurrent: 0,
            woundPenalty: 0,
        }).actionPenalty).toBe(0);
    });

    it('stunned penalty passes through stunsCurrent', () => {
        expect(computePenalties({
            rollType: 'skill',
            actionItemCount: 1,
            stunsCurrent: 7,
            woundPenalty: 0,
        }).stunnedPenalty).toBe(7);
    });
});
