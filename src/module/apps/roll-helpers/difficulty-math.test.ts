import { describe, it, expect } from 'vitest';
import {
    selectHighestDefense,
    sumModifiers,
    applyDifficultyModifiers,
    applyDamageModifiers,
    bucketRangeFromDistance,
    splitBonusForPenalty,
} from './difficulty-math';

describe('selectHighestDefense', () => {
    it('picks dodge when highest', () => {
        expect(selectHighestDefense({ dodge: 12, parry: 8, block: 6 })).toBe(12);
    });

    it('picks parry when highest', () => {
        expect(selectHighestDefense({ dodge: 5, parry: 11, block: 9 })).toBe(11);
    });

    it('picks block when highest', () => {
        expect(selectHighestDefense({ dodge: 3, parry: 7, block: 10 })).toBe(10);
    });

    it('handles ties (returns the shared value)', () => {
        expect(selectHighestDefense({ dodge: 8, parry: 8, block: 8 })).toBe(8);
    });

    it('returns 0 when all are zero', () => {
        expect(selectHighestDefense({ dodge: 0, parry: 0, block: 0 })).toBe(0);
    });
});

describe('sumModifiers', () => {
    it('returns 0 for empty list', () => {
        expect(sumModifiers([])).toBe(0);
    });

    it('sums positive values', () => {
        expect(sumModifiers([{ value: 3 }, { value: 5 }, { value: 2 }])).toBe(10);
    });

    it('handles negative values', () => {
        expect(sumModifiers([{ value: 5 }, { value: -3 }, { value: -2 }])).toBe(0);
    });

    it('sums to negative when penalties exceed bonuses', () => {
        expect(sumModifiers([{ value: 2 }, { value: -7 }])).toBe(-5);
    });

    it('coerces string-numeric values', () => {
        expect(sumModifiers([{ value: '3' as any }, { value: '4' as any }])).toBe(7);
    });
});

describe('applyDifficultyModifiers', () => {
    it('returns base when no modifiers', () => {
        expect(applyDifficultyModifiers(15, [])).toBe(15);
    });

    it('adds positive modifiers to base', () => {
        expect(applyDifficultyModifiers(10, [{ value: 5 }, { value: 3 }])).toBe(18);
    });

    it('subtracts negative modifiers from base', () => {
        expect(applyDifficultyModifiers(20, [{ value: -5 }, { value: -3 }])).toBe(12);
    });

    it('returns negative result when modifiers exceed base (no floor applied)', () => {
        expect(applyDifficultyModifiers(5, [{ value: -10 }])).toBe(-5);
    });
});

describe('applyDamageModifiers', () => {
    it('returns base when no modifiers', () => {
        expect(applyDamageModifiers(12, [])).toBe(12);
    });

    it('adds all modifiers when no exclusion', () => {
        expect(applyDamageModifiers(10, [
            { name: 'OD6S.SCALE', value: 2 },
            { name: 'OD6S.STRENGTH_DAMAGE_BONUS', value: 3 },
        ])).toBe(15);
    });

    it('excludes the named modifier', () => {
        // Used by fatepointeffect to skip strength damage doubling
        expect(applyDamageModifiers(10, [
            { name: 'OD6S.SCALE', value: 2 },
            { name: 'OD6S.STRENGTH_DAMAGE_BONUS', value: 3 },
        ], 'OD6S.STRENGTH_DAMAGE_BONUS')).toBe(12);
    });

    it('exclusion name with no match leaves all modifiers in', () => {
        expect(applyDamageModifiers(10, [
            { name: 'OD6S.SCALE', value: 2 },
        ], 'OD6S.UNRELATED')).toBe(12);
    });
});

describe('bucketRangeFromDistance', () => {
    const range = { short: 10, medium: 30, long: 60 };

    it('returns point blank for distance < 3', () => {
        expect(bucketRangeFromDistance(0, range, false)).toEqual({
            range: 'OD6S.RANGE_POINT_BLANK_SHORT',
            difficultyLevel: null,
        });
        expect(bucketRangeFromDistance(2, range, false)).toEqual({
            range: 'OD6S.RANGE_POINT_BLANK_SHORT',
            difficultyLevel: null,
        });
    });

    it('returns short range at boundary', () => {
        expect(bucketRangeFromDistance(3, range, false)).toEqual({
            range: 'OD6S.RANGE_SHORT_SHORT',
            difficultyLevel: null,
        });
        expect(bucketRangeFromDistance(10, range, false)).toEqual({
            range: 'OD6S.RANGE_SHORT_SHORT',
            difficultyLevel: null,
        });
    });

    it('returns medium range at boundary', () => {
        expect(bucketRangeFromDistance(11, range, false)).toEqual({
            range: 'OD6S.RANGE_MEDIUM_SHORT',
            difficultyLevel: null,
        });
        expect(bucketRangeFromDistance(30, range, false)).toEqual({
            range: 'OD6S.RANGE_MEDIUM_SHORT',
            difficultyLevel: null,
        });
    });

    it('returns long range at boundary', () => {
        expect(bucketRangeFromDistance(31, range, false)).toEqual({
            range: 'OD6S.RANGE_LONG_SHORT',
            difficultyLevel: null,
        });
        expect(bucketRangeFromDistance(60, range, false)).toEqual({
            range: 'OD6S.RANGE_LONG_SHORT',
            difficultyLevel: null,
        });
    });

    it('returns null when distance exceeds long range', () => {
        expect(bucketRangeFromDistance(61, range, false)).toBeNull();
        expect(bucketRangeFromDistance(1000, range, false)).toBeNull();
    });

    it('emits matching difficulty level when mapRangeToDifficulty is on', () => {
        expect(bucketRangeFromDistance(2, range, true)?.difficultyLevel).toBe('OD6S.DIFFICULTY_VERY_EASY');
        expect(bucketRangeFromDistance(5, range, true)?.difficultyLevel).toBe('OD6S.DIFFICULTY_EASY');
        expect(bucketRangeFromDistance(20, range, true)?.difficultyLevel).toBe('OD6S.DIFFICULTY_MODERATE');
        expect(bucketRangeFromDistance(50, range, true)?.difficultyLevel).toBe('OD6S.DIFFICULTY_DIFFICULT');
    });
});

describe('splitBonusForPenalty', () => {
    const pipsPerDice = 3;

    it('passes through positive bonuses', () => {
        expect(splitBonusForPenalty(2, 1, pipsPerDice)).toEqual({
            bonusDice: 2,
            bonusPips: 1,
            penaltyDice: 0,
        });
    });

    it('passes through zero', () => {
        expect(splitBonusForPenalty(0, 0, pipsPerDice)).toEqual({
            bonusDice: 0,
            bonusPips: 0,
            penaltyDice: 0,
        });
    });

    it('converts negative dice to penalty dice and zeros bonus', () => {
        // -2D = score -6 → penalty 2 dice
        expect(splitBonusForPenalty(-2, 0, pipsPerDice)).toEqual({
            bonusDice: 0,
            bonusPips: 0,
            penaltyDice: 2,
        });
    });

    it('negative score with mixed dice/pips converts to penalty', () => {
        // -3D+2 = -7, still negative
        expect(splitBonusForPenalty(-3, 2, pipsPerDice)).toEqual({
            bonusDice: 0,
            bonusPips: 0,
            penaltyDice: 3,
        });
    });

    it('borderline non-negative passes through', () => {
        // -1D+3 = 0, not negative
        expect(splitBonusForPenalty(-1, 3, pipsPerDice)).toEqual({
            bonusDice: -1,
            bonusPips: 3,
            penaltyDice: 0,
        });
    });
});
