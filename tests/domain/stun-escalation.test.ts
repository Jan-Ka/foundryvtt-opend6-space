/**
 * Domain tests: Stun escalation (Chapter 9 / opposed roll rules)
 *
 * Pure function under test:
 *   src/module/system/utilities/opposed.ts — computeStunEffect
 */

import { describe, it, expect } from 'vitest';
import { computeStunEffect } from '../../src/module/system/utilities/opposed';

// ---------------------------------------------------------------------------
// stunScaling = false (book default)
// Without the scaling option every successful stun always knocks the target
// unconscious regardless of the roll margin.
// ---------------------------------------------------------------------------

describe('computeStunEffect — stunScaling disabled (book default)', () => {
    it('any win → unconscious', () => {
        expect(computeStunEffect(10, 5, false)).toBe('unconscious');
    });

    it('tiny margin (winner=2, loser=1) → unconscious', () => {
        expect(computeStunEffect(2, 1, false)).toBe('unconscious');
    });

    it('massive margin → still unconscious', () => {
        expect(computeStunEffect(30, 1, false)).toBe('unconscious');
    });
});

// ---------------------------------------------------------------------------
// stunScaling = true (optional rule)
// Thresholds (Book p9 / opposed.ts):
//   winner ≥ 3× loser → unconscious
//   winner ≥ 2× loser → -2D
//   otherwise         → -1D
// ---------------------------------------------------------------------------

describe('computeStunEffect — stunScaling enabled', () => {
    it('winner exactly 3× loser → unconscious', () => {
        expect(computeStunEffect(15, 5, true)).toBe('unconscious');
    });

    it('winner > 3× loser → unconscious', () => {
        expect(computeStunEffect(20, 5, true)).toBe('unconscious');
    });

    it('winner exactly 2× loser → -2D', () => {
        expect(computeStunEffect(10, 5, true)).toBe('-2D');
    });

    it('winner > 2× but < 3× loser → -2D', () => {
        expect(computeStunEffect(14, 5, true)).toBe('-2D');
    });

    it('winner < 2× loser → -1D', () => {
        expect(computeStunEffect(9, 5, true)).toBe('-1D');
    });

    it('winner barely wins (winner=6, loser=5) → -1D', () => {
        expect(computeStunEffect(6, 5, true)).toBe('-1D');
    });

    it('equal totals → -1D (loser did not exceed winner)', () => {
        expect(computeStunEffect(5, 5, true)).toBe('-1D');
    });
});
