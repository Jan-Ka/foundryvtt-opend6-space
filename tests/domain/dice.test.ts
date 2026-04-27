/**
 * Domain drift tests: Dice / Score Conversion
 *
 * Verifies the bidirectional mapping between raw score integers and the
 * dice+pips representation used throughout the system (pipsPerDice = 3).
 *
 * Pure functions under test: src/module/system/utilities/dice.ts
 */

import { describe, it, expect } from 'vitest';
import {
    getDiceFromScore,
    getTextFromDice,
    getScoreFromDice,
} from '../../src/module/system/utilities/dice';

const PIPS = 3; // standard pips-per-die for OpenD6

// ---------------------------------------------------------------------------
// getDiceFromScore
// ---------------------------------------------------------------------------

describe('getDiceFromScore', () => {
    it('score 0 → 0D+0', () => {
        expect(getDiceFromScore(0, PIPS)).toEqual({ dice: 0, pips: 0 });
    });

    it('score 3 → 1D+0 (exactly one die)', () => {
        expect(getDiceFromScore(3, PIPS)).toEqual({ dice: 1, pips: 0 });
    });

    it('score 4 → 1D+1', () => {
        expect(getDiceFromScore(4, PIPS)).toEqual({ dice: 1, pips: 1 });
    });

    it('score 9 → 3D+0', () => {
        expect(getDiceFromScore(9, PIPS)).toEqual({ dice: 3, pips: 0 });
    });

    it('score 10 → 3D+1', () => {
        expect(getDiceFromScore(10, PIPS)).toEqual({ dice: 3, pips: 1 });
    });

    it('score 14 → 4D+2 (running example from source)', () => {
        expect(getDiceFromScore(14, PIPS)).toEqual({ dice: 4, pips: 2 });
    });

    it('score 15 → 5D+0', () => {
        expect(getDiceFromScore(15, PIPS)).toEqual({ dice: 5, pips: 0 });
    });
});

// ---------------------------------------------------------------------------
// getTextFromDice
// ---------------------------------------------------------------------------

describe('getTextFromDice', () => {
    it('0D+0 → "0D+0"', () => {
        expect(getTextFromDice({ dice: 0, pips: 0 })).toBe('0D+0');
    });

    it('3D+0 → "3D+0"', () => {
        expect(getTextFromDice({ dice: 3, pips: 0 })).toBe('3D+0');
    });

    it('4D+2 → "4D+2"', () => {
        expect(getTextFromDice({ dice: 4, pips: 2 })).toBe('4D+2');
    });

    it('5D+1 → "5D+1"', () => {
        expect(getTextFromDice({ dice: 5, pips: 1 })).toBe('5D+1');
    });
});

// ---------------------------------------------------------------------------
// getScoreFromDice
// ---------------------------------------------------------------------------

describe('getScoreFromDice', () => {
    it('0D+0 → score 0', () => {
        expect(getScoreFromDice(0, 0, PIPS)).toBe(0);
    });

    it('1D+0 → score 3', () => {
        expect(getScoreFromDice(1, 0, PIPS)).toBe(3);
    });

    it('3D+1 → score 10', () => {
        expect(getScoreFromDice(3, 1, PIPS)).toBe(10);
    });

    it('4D+2 → score 14 (running example from source)', () => {
        expect(getScoreFromDice(4, 2, PIPS)).toBe(14);
    });

    it('5D+0 → score 15', () => {
        expect(getScoreFromDice(5, 0, PIPS)).toBe(15);
    });
});

// ---------------------------------------------------------------------------
// Round-trip: getDiceFromScore ↔ getScoreFromDice
// ---------------------------------------------------------------------------

describe('round-trip consistency', () => {
    const scores = [0, 1, 2, 3, 4, 5, 9, 10, 11, 14, 15, 18, 21];

    for (const score of scores) {
        it(`score ${score} survives getDiceFromScore → getScoreFromDice`, () => {
            const dice = getDiceFromScore(score, PIPS);
            expect(getScoreFromDice(dice.dice, dice.pips, PIPS)).toBe(score);
        });
    }
});
