/**
 * Domain drift tests: Skill display-score computation.
 *
 * Pure function under test: src/module/actor/actor-helpers/skill-score.ts
 *
 * Rules being verified (3 pips per die):
 *   - Non-advanced skill: display = base + mod + attribute
 *   - Advanced skill:     display = base + mod   (attribute not added)
 *   - Flat-skill mode:    display = base + mod   (regardless of advanced flag)
 *   - Idempotent: result derives only from current inputs, never from a
 *     previously-computed `score` (regression for the compounding bug
 *     where actor-sheet.ts mutated score in-place across renders).
 *   - Pure: never mutates its input object.
 */

import { describe, it, expect } from 'vitest';
import { computeSkillDisplayScore } from '../../src/module/actor/actor-helpers/skill-score';

// ---------------------------------------------------------------------------
// Branch coverage
// ---------------------------------------------------------------------------

describe('computeSkillDisplayScore — non-advanced skill', () => {
    it('adds the attribute to base + mod', () => {
        // Mechanical 5D+1 (16 pips), skill +1D (3 pips), no mod
        expect(computeSkillDisplayScore({
            base: 3,
            mod: 0,
            isAdvancedSkill: false,
            attributeScore: 16,
        })).toBe(19); // 6D+1
    });

    it('handles negative base (skill below the linked attribute)', () => {
        // -2D = -6 pips, attribute 6D (18 pips) → 4D
        expect(computeSkillDisplayScore({
            base: -6,
            mod: 0,
            isAdvancedSkill: false,
            attributeScore: 18,
        })).toBe(12);
    });

    it('includes mod in the sum', () => {
        expect(computeSkillDisplayScore({
            base: 3,
            mod: 2,
            isAdvancedSkill: false,
            attributeScore: 12,
        })).toBe(17);
    });
});

describe('computeSkillDisplayScore — advanced skill', () => {
    it('does not add the attribute', () => {
        // (A) Skill at 2D advanced, attribute is irrelevant
        expect(computeSkillDisplayScore({
            base: 6,
            mod: 0,
            isAdvancedSkill: true,
            attributeScore: 18,
        })).toBe(6);
    });

    it('still respects mod', () => {
        expect(computeSkillDisplayScore({
            base: 6,
            mod: 3,
            isAdvancedSkill: true,
            attributeScore: 18,
        })).toBe(9);
    });

    it('preserves negative scores', () => {
        // The reported failure mode: an "advanced" skill stored at -2D should
        // surface as -2D, not get the attribute added on top.
        expect(computeSkillDisplayScore({
            base: -6,
            mod: 0,
            isAdvancedSkill: true,
            attributeScore: 18,
        })).toBe(-6);
    });
});

describe('computeSkillDisplayScore — flat-skill mode', () => {
    it('returns base + mod regardless of attribute', () => {
        expect(computeSkillDisplayScore({
            base: 3,
            mod: 1,
            isAdvancedSkill: false,
            attributeScore: 18,
            flatSkills: true,
        })).toBe(4);
    });

    it('returns base + mod for advanced skills too', () => {
        expect(computeSkillDisplayScore({
            base: 6,
            mod: 0,
            isAdvancedSkill: true,
            attributeScore: 18,
            flatSkills: true,
        })).toBe(6);
    });
});

describe('computeSkillDisplayScore — defaults', () => {
    it('treats missing attributeScore as 0', () => {
        expect(computeSkillDisplayScore({ base: 3, mod: 0 })).toBe(3);
    });

    it('treats missing isAdvancedSkill as non-advanced', () => {
        expect(computeSkillDisplayScore({
            base: 3,
            mod: 0,
            attributeScore: 6,
        })).toBe(9);
    });
});

// ---------------------------------------------------------------------------
// Regression: compounding bug
// ---------------------------------------------------------------------------
// The original code at actor-sheet.ts:_prepareCharacterItems mutated
// `i.system.score` in place — `score = score + attribute.score`. Because
// prepareDerivedData() only re-resets `score = base + mod` when the actor is
// re-prepared (not on every sheet render), a sheet rendered N times without
// an actor update accumulated the attribute N times, producing
//   score = base + mod + N × attributeScore
// The reproduction reported in the wild had a player's "(A) Space Transport
// Engineering" displaying 8D when its base was -4D and the linked attribute
// (Technical) was 6D — i.e. -12 + 2 × 18 = 24 pips = 8D after two renders.

describe('computeSkillDisplayScore — regression: compounding bug', () => {
    it('returns the same value when called repeatedly with the same inputs', () => {
        const inputs = {
            base: -12,
            mod: 0,
            isAdvancedSkill: false,
            attributeScore: 18,
        };
        const r1 = computeSkillDisplayScore(inputs);
        const r2 = computeSkillDisplayScore(inputs);
        const r3 = computeSkillDisplayScore(inputs);
        expect(r1).toBe(6);  // -12 + 18; NOT 24, NOT 42
        expect(r2).toBe(r1);
        expect(r3).toBe(r1);
    });

    it('does not mutate its input object', () => {
        const inputs = {
            base: -12,
            mod: 0,
            isAdvancedSkill: false,
            attributeScore: 18,
        };
        const snapshot = { ...inputs };
        computeSkillDisplayScore(inputs);
        computeSkillDisplayScore(inputs);
        expect(inputs).toEqual(snapshot);
    });

    it('reproduces the reported user data and produces the correct score', () => {
        // Azul's "(A) Space Transport Engineering":
        //   base = -12 (player intended -4D), mod = 0, attribute "tec" = 18
        // The buggy path produced 24 (8D). The pure helper must produce
        // the right value for whichever flag the data actually carries.
        const stored = { base: -12, mod: 0, attributeScore: 18 };

        // As actually stored (isAdvancedSkill: false): -12 + 18 = 6 (= 2D)
        expect(computeSkillDisplayScore({ ...stored, isAdvancedSkill: false })).toBe(6);

        // If the flag is corrected to advanced: -12 (= -4D) is shown directly
        expect(computeSkillDisplayScore({ ...stored, isAdvancedSkill: true })).toBe(-12);
    });
});
