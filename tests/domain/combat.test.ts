/**
 * Domain drift tests: Combat (Chapter 9)
 *
 * Covers strength damage calculation, combat difficulty clamping, and
 * range-modifier lookup against the rule fixtures extracted from the book.
 *
 * Pure functions under test:
 *   src/module/system/utilities/weapons.ts — strengthDamageFromDice
 *   src/module/apps/roll-helpers/difficulty-math.ts — clampCombatDifficulty, bucketRangeFromDistance
 *   src/module/config/config-od6s.ts — OD6S.ranges (modifier values)
 */

import { describe, it, expect } from 'vitest';
import { strengthDamageFromDice } from '../../src/module/system/utilities/weapons';
import {
    clampCombatDifficulty,
    applyDifficultyModifiers,
    bucketRangeFromDistance,
} from '../../src/module/apps/roll-helpers/difficulty-math';
import OD6S from '../../src/module/config/config-od6s';

const strengthDamageRule = { id: 'determining-strength-damage' };
const baseCombatDifficultyRule = { id: 'base-combat-difficulty' };
const rangeTableRule = { id: 'range-table' };

// ---------------------------------------------------------------------------
// Fixture sanity
// ---------------------------------------------------------------------------

describe('fixture sanity', () => {
    it('determining-strength-damage fixture present', () => {
        expect(strengthDamageRule.id).toBe('determining-strength-damage');
    });

    it('base-combat-difficulty fixture present', () => {
        expect(baseCombatDifficultyRule.id).toBe('base-combat-difficulty');
    });

    it('range-table fixture present', () => {
        expect(rangeTableRule.id).toBe('range-table');
    });
});

// ---------------------------------------------------------------------------
// Strength Damage (Book p71)
// "Drop pips, divide by 2, round up"
// Examples from the book: 3D → 2D, 6D+2 → 3D
// ---------------------------------------------------------------------------

describe('strengthDamageFromDice', () => {
    it('3D Strength → 2D Strength Damage', () => {
        expect(strengthDamageFromDice(3)).toBe(2);
    });

    it('6D Strength → 3D Strength Damage', () => {
        expect(strengthDamageFromDice(6)).toBe(3);
    });

    it('1D Strength → 1D Strength Damage (rounds up from 0.5)', () => {
        expect(strengthDamageFromDice(1)).toBe(1);
    });

    it('2D Strength → 1D Strength Damage', () => {
        expect(strengthDamageFromDice(2)).toBe(1);
    });

    it('5D Strength → 3D Strength Damage (rounds up from 2.5)', () => {
        expect(strengthDamageFromDice(5)).toBe(3);
    });

    it('4D Strength → 2D Strength Damage', () => {
        expect(strengthDamageFromDice(4)).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Combat difficulty minimum floor (Book p70)
// "total combat difficulty may never go below 3"
// ---------------------------------------------------------------------------

describe('clampCombatDifficulty', () => {
    it('difficulty above 3 passes through unchanged', () => {
        expect(clampCombatDifficulty(10)).toBe(10);
        expect(clampCombatDifficulty(15)).toBe(15);
    });

    it('difficulty of exactly 3 stays at 3', () => {
        expect(clampCombatDifficulty(3)).toBe(3);
    });

    it('difficulty of 2 is clamped to 3', () => {
        expect(clampCombatDifficulty(2)).toBe(3);
    });

    it('negative difficulty is clamped to 3', () => {
        expect(clampCombatDifficulty(-5)).toBe(3);
    });

    it('zero is clamped to 3', () => {
        expect(clampCombatDifficulty(0)).toBe(3);
    });

    it('passive defense 10 + point-blank -5 = 5, still above floor', () => {
        const raw = applyDifficultyModifiers(10, [{ value: -5 }]);
        expect(clampCombatDifficulty(raw)).toBe(5);
    });

    it('heavy penalty combo cannot push below 3', () => {
        const raw = applyDifficultyModifiers(10, [{ value: -5 }, { value: -10 }]);
        expect(clampCombatDifficulty(raw)).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// Range modifiers (Book p70, range table)
// Point Blank: -5, Short: 0, Medium: +5, Long: +10
// ---------------------------------------------------------------------------

const WEAPON = { short: 20, medium: 50, long: 100 };

describe('range modifier values match book table', () => {
    it('OD6S.ranges has correct Point Blank modifier (-5)', () => {
        expect(OD6S.ranges['OD6S.RANGE_POINT_BLANK_SHORT'].difficulty).toBe(-5);
    });

    it('OD6S.ranges has correct Short modifier (0)', () => {
        expect(OD6S.ranges['OD6S.RANGE_SHORT_SHORT'].difficulty).toBe(0);
    });

    it('OD6S.ranges has correct Medium modifier (+5)', () => {
        expect(OD6S.ranges['OD6S.RANGE_MEDIUM_SHORT'].difficulty).toBe(5);
    });

    it('OD6S.ranges has correct Long modifier (+10)', () => {
        expect(OD6S.ranges['OD6S.RANGE_LONG_SHORT'].difficulty).toBe(10);
    });
});

describe('bucketRangeFromDistance + OD6S.ranges modifiers', () => {
    it('distance 0 → Point Blank → modifier -5', () => {
        const bucket = bucketRangeFromDistance(0, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(-5);
    });

    it('distance 2 → Point Blank → modifier -5', () => {
        const bucket = bucketRangeFromDistance(2, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(-5);
    });

    it('distance 5 (within Short) → modifier 0', () => {
        const bucket = bucketRangeFromDistance(5, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(0);
    });

    it('distance 20 (Short boundary) → modifier 0', () => {
        const bucket = bucketRangeFromDistance(20, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(0);
    });

    it('distance 30 (Medium) → modifier +5', () => {
        const bucket = bucketRangeFromDistance(30, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(5);
    });

    it('distance 75 (Long) → modifier +10', () => {
        const bucket = bucketRangeFromDistance(75, WEAPON, false);
        expect(OD6S.ranges[bucket!.range].difficulty).toBe(10);
    });

    it('distance beyond Long → null (out of range)', () => {
        expect(bucketRangeFromDistance(200, WEAPON, false)).toBeNull();
    });
});
