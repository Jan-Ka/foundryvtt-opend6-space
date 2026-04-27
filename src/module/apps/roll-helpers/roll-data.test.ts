import { describe, it, expect } from 'vitest';
import { computeScaleMod, coerceScale, isScoreTooLow } from './roll-data';

describe('computeScaleMod', () => {
    it('returns 0 when scales match', () => {
        expect(computeScaleMod(3, 3)).toBe(0);
        expect(computeScaleMod(0, 0)).toBe(0);
    });

    it('returns positive when attacker scale is larger', () => {
        expect(computeScaleMod(5, 2)).toBe(3);
    });

    it('returns negative when defender scale is larger', () => {
        expect(computeScaleMod(2, 5)).toBe(-3);
    });
});

describe('coerceScale', () => {
    it('passes through positive numbers', () => {
        expect(coerceScale(3)).toBe(3);
    });

    it('passes through 0', () => {
        expect(coerceScale(0)).toBe(0);
    });

    it('passes through negative numbers', () => {
        expect(coerceScale(-2)).toBe(-2);
    });

    it('returns 0 for undefined', () => {
        expect(coerceScale(undefined)).toBe(0);
    });

    it('returns 0 for null', () => {
        expect(coerceScale(null)).toBe(0);
    });

    it('returns 0 for NaN', () => {
        expect(coerceScale(NaN)).toBe(0);
    });
});

describe('isScoreTooLow', () => {
    const pipsPerDice = 3;

    it('returns true when score is below pipsPerDice', () => {
        expect(isScoreTooLow(0, pipsPerDice, false)).toBe(true);
        expect(isScoreTooLow(2, pipsPerDice, false)).toBe(true);
    });

    it('returns false when score equals pipsPerDice', () => {
        expect(isScoreTooLow(3, pipsPerDice, false)).toBe(false);
    });

    it('returns false when score exceeds pipsPerDice', () => {
        expect(isScoreTooLow(15, pipsPerDice, false)).toBe(false);
    });

    it('flatSkills bypass returns false even for low scores', () => {
        // For flatSkills mode, skill/spec rolls allow score=0 (the dice come from the attribute)
        expect(isScoreTooLow(0, pipsPerDice, true)).toBe(false);
        expect(isScoreTooLow(2, pipsPerDice, true)).toBe(false);
    });
});
