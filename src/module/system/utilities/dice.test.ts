import { describe, it, expect } from 'vitest';
import { getDiceFromScore, getScoreFromDice, getTextFromDice } from './dice';

describe('getDiceFromScore', () => {
    it('converts score to dice and pips with pipsPerDice=3', () => {
        expect(getDiceFromScore(14, 3)).toEqual({ dice: 4, pips: 2 });
    });

    it('returns zero pips on exact die boundary', () => {
        expect(getDiceFromScore(15, 3)).toEqual({ dice: 5, pips: 0 });
    });

    it('handles zero score', () => {
        expect(getDiceFromScore(0, 3)).toEqual({ dice: 0, pips: 0 });
    });

    it('handles score less than one die', () => {
        expect(getDiceFromScore(2, 3)).toEqual({ dice: 0, pips: 2 });
    });

    it('works with pipsPerDice=4', () => {
        expect(getDiceFromScore(14, 4)).toEqual({ dice: 3, pips: 2 });
    });

    it('handles single die exactly', () => {
        expect(getDiceFromScore(3, 3)).toEqual({ dice: 1, pips: 0 });
    });
});

describe('getScoreFromDice', () => {
    it('converts dice and pips back to score', () => {
        expect(getScoreFromDice(4, 2, 3)).toBe(14);
    });

    it('handles zero dice', () => {
        expect(getScoreFromDice(0, 2, 3)).toBe(2);
    });

    it('handles zero pips', () => {
        expect(getScoreFromDice(5, 0, 3)).toBe(15);
    });

    it('handles string inputs via coercion', () => {
        expect(getScoreFromDice('4' as any, '2' as any, 3)).toBe(14);
    });

    it('round-trips with getDiceFromScore', () => {
        for (let score = 0; score <= 30; score++) {
            const { dice, pips } = getDiceFromScore(score, 3);
            expect(getScoreFromDice(dice, pips, 3)).toBe(score);
        }
    });
});

describe('getTextFromDice', () => {
    it('formats dice and pips as text', () => {
        expect(getTextFromDice({ dice: 4, pips: 2 })).toBe('4D+2');
    });

    it('shows zero pips', () => {
        expect(getTextFromDice({ dice: 5, pips: 0 })).toBe('5D+0');
    });

    it('handles zero dice', () => {
        expect(getTextFromDice({ dice: 0, pips: 1 })).toBe('0D+1');
    });
});
