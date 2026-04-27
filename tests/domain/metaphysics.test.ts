/**
 * Domain tests: Metaphysics attribute advancement cost (Chapter 14)
 *
 * Pure function under test:
 *   src/module/system/utilities/metaphysics.ts — computeMetaphysicsAttributeCost
 *
 * Rule source: p92 "Obtaining Access to Metaphysics"
 *   - Initial 1D: 20 CP (flat)
 *   - Each subsequent pip: 10 × currentDice CP
 *
 * Fixture: docs/reference/rules/chapter-14-metaphysics/metaphysics-access-cost.json
 */

import { describe, it, expect } from 'vitest';
import { computeMetaphysicsAttributeCost } from '../../src/module/system/utilities/metaphysics';
import metaphysicsCostRule from '../../docs/reference/rules/chapter-14-metaphysics/metaphysics-access-cost.json';

// ---------------------------------------------------------------------------
// Fixture sanity
// ---------------------------------------------------------------------------

describe('fixture sanity', () => {
    it('metaphysics-access-cost fixture is present', () => {
        expect(metaphysicsCostRule.id).toBe('metaphysics-access-cost');
    });
});

// ---------------------------------------------------------------------------
// Initial access (0D → 1D)
// ---------------------------------------------------------------------------

describe('computeMetaphysicsAttributeCost — initial access', () => {
    it('0D → 1D costs 20 CP (flat initial rate)', () => {
        expect(computeMetaphysicsAttributeCost(0)).toBe(20);
    });
});

// ---------------------------------------------------------------------------
// Subsequent pips — fixture edge cases (p92)
// ---------------------------------------------------------------------------

describe('computeMetaphysicsAttributeCost — subsequent pips', () => {
    // Fixture edge case 1: "1D → 1D+1: Costs 10 CP (10 × 1)"
    it('1D → 1D+1 costs 10 CP (fixture edge case)', () => {
        expect(computeMetaphysicsAttributeCost(1)).toBe(10);
    });

    // All three pips within the 1D tier share the same cost (die = 1 throughout)
    it('1D+1 → 1D+2 costs 10 CP', () => {
        expect(computeMetaphysicsAttributeCost(1)).toBe(10);
    });

    it('1D+2 → 2D costs 10 CP', () => {
        expect(computeMetaphysicsAttributeCost(1)).toBe(10);
    });

    // Fixture edge case 2: "2D → 2D+1: Costs 20 CP (10 × 2)"
    it('2D → 2D+1 costs 20 CP (fixture edge case)', () => {
        expect(computeMetaphysicsAttributeCost(2)).toBe(20);
    });

    it('3D → 3D+1 costs 30 CP', () => {
        expect(computeMetaphysicsAttributeCost(3)).toBe(30);
    });

    it('5D → 5D+1 costs 50 CP', () => {
        expect(computeMetaphysicsAttributeCost(5)).toBe(50);
    });

    it('cost scales linearly with die number', () => {
        for (let d = 1; d <= 8; d++) {
            expect(computeMetaphysicsAttributeCost(d)).toBe(10 * d);
        }
    });
});
