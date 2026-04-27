/**
 * Domain tests: Edit-difficulty chat-card math
 *
 * Pure function under test:
 *   src/module/apps/roll-helpers/difficulty-math.ts — computeDifficultyUpdate
 *
 * When a GM adjusts the base difficulty on an already-rolled chat card the
 * new difficulty is recomputed and the success flag is re-evaluated:
 *
 *   diff          = newBase − oldBase
 *   newDifficulty = oldDiff + diff
 *   success       = rollTotal ≥ newDifficulty
 */

import { describe, it, expect } from 'vitest';
import { computeDifficultyUpdate } from '../../src/module/apps/roll-helpers/difficulty-math';

describe('computeDifficultyUpdate', () => {
    it('no change (newBase = oldBase) → difficulty unchanged', () => {
        const result = computeDifficultyUpdate(10, 10, 15, 20);
        expect(result.newDifficulty).toBe(15);
    });

    it('raised base by 5 → difficulty rises by 5', () => {
        const result = computeDifficultyUpdate(10, 15, 15, 20);
        expect(result.newDifficulty).toBe(20);
    });

    it('lowered base by 5 → difficulty drops by 5', () => {
        const result = computeDifficultyUpdate(10, 5, 15, 20);
        expect(result.newDifficulty).toBe(10);
    });

    it('roll exactly equals new difficulty → success', () => {
        const result = computeDifficultyUpdate(10, 10, 15, 15);
        expect(result.success).toBe(true);
    });

    it('roll one above new difficulty → success', () => {
        const result = computeDifficultyUpdate(10, 10, 15, 16);
        expect(result.success).toBe(true);
    });

    it('roll one below new difficulty → failure', () => {
        const result = computeDifficultyUpdate(10, 10, 15, 14);
        expect(result.success).toBe(false);
    });

    it('raising base turns a success into a failure', () => {
        // Old diff 10, roll 12 → success (12 ≥ 10).
        // GM raises base by 5 → newDiff 15. Roll 12 < 15 → failure.
        const result = computeDifficultyUpdate(10, 15, 10, 12);
        expect(result.newDifficulty).toBe(15);
        expect(result.success).toBe(false);
    });

    it('lowering base turns a failure into a success', () => {
        // Old diff 20, roll 15 → failure (15 < 20).
        // GM lowers base by 10 → newDiff 10. Roll 15 ≥ 10 → success.
        const result = computeDifficultyUpdate(20, 10, 20, 15);
        expect(result.newDifficulty).toBe(10);
        expect(result.success).toBe(true);
    });
});
