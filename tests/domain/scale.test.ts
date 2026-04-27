/**
 * Domain tests: Scale modifier (Chapter 7 / vehicle combat rules)
 *
 * Pure function under test:
 *   src/module/system/utilities/scale.ts — computeScaleModifier
 *
 * A smaller attacker faces a harder resistance roll from a larger defender.
 * The penalty equals the raw difference in scale values. Larger or equal
 * attackers receive no bonus or penalty.
 */

import { describe, it, expect } from 'vitest';
import { computeScaleModifier } from '../../src/module/system/utilities/scale';

describe('computeScaleModifier', () => {
    it('equal scales → no modifier', () => {
        expect(computeScaleModifier(5, 5)).toBe(0);
    });

    it('attacker larger than defender → no modifier', () => {
        expect(computeScaleModifier(10, 5)).toBe(0);
    });

    it('attacker much larger → no modifier', () => {
        expect(computeScaleModifier(20, 3)).toBe(0);
    });

    it('attacker smaller by 1 → modifier +1', () => {
        expect(computeScaleModifier(4, 5)).toBe(1);
    });

    it('attacker smaller by 5 → modifier +5', () => {
        expect(computeScaleModifier(0, 5)).toBe(5);
    });

    it('attacker scale 0 vs defender scale 12 → modifier +12', () => {
        expect(computeScaleModifier(0, 12)).toBe(12);
    });

    it('attacker 1 pip smaller (scale 6 vs 7) → modifier +1', () => {
        expect(computeScaleModifier(6, 7)).toBe(1);
    });
});
