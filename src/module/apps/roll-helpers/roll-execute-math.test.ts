import { describe, it, expect } from 'vitest';
import { computeHighHitDamage, computeWildDieReduction, resolveRollMode } from './roll-execute-math';

describe('computeHighHitDamage', () => {
    it('returns 0 when the roll fails to meet difficulty', () => {
        expect(computeHighHitDamage({
            rollTotal: 10, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 0, asPips: false });
    });

    it('returns 0 on an exact tie (difference is zero)', () => {
        expect(computeHighHitDamage({
            rollTotal: 15, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 0, asPips: false });
    });

    it('rounds down when configured to round down', () => {
        // diff = 9, multiplier = 5 → 9/5 = 1.8 → floor = 1
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        })).toEqual({ extra: 1, asPips: false });
    });

    it('rounds up when configured to round up', () => {
        // diff = 9, multiplier = 5 → 9/5 = 1.8 → ceil = 2
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 5, roundDown: false, asPips: false,
        })).toEqual({ extra: 2, asPips: false });
    });

    it('passes asPips through to the result', () => {
        expect(computeHighHitDamage({
            rollTotal: 20, difficulty: 10, multiplier: 5, roundDown: true, asPips: true,
        }).asPips).toBe(true);
    });

    it('returns 0 when multiplier is non-positive (defensive)', () => {
        expect(computeHighHitDamage({
            rollTotal: 24, difficulty: 15, multiplier: 0, roundDown: true, asPips: false,
        }).extra).toBe(0);
    });

    it('handles a clean integer division', () => {
        // diff = 10, multiplier = 5 → exactly 2 (no rounding ambiguity)
        const down = computeHighHitDamage({
            rollTotal: 25, difficulty: 15, multiplier: 5, roundDown: true, asPips: false,
        });
        const up = computeHighHitDamage({
            rollTotal: 25, difficulty: 15, multiplier: 5, roundDown: false, asPips: false,
        });
        expect(down.extra).toBe(2);
        expect(up.extra).toBe(2);
    });
});

describe('computeWildDieReduction', () => {
    it('finds and discards the highest base die', () => {
        const dice = [
            { result: 3, active: true },
            { result: 6, active: true },
            { result: 4, active: true },
        ];
        // original total includes wild die 1: 3+6+4+1 = 14
        const r = computeWildDieReduction(dice, 14);
        expect(r.discardedIndex).toBe(1);
        // 14 - 6 (discarded) - 1 (wild) = 7
        expect(r.newTotal).toBe(7);
    });

    it('picks the first occurrence when ties exist', () => {
        const dice = [
            { result: 5, active: true },
            { result: 5, active: true },
            { result: 2, active: true },
        ];
        const r = computeWildDieReduction(dice, 13);
        expect(r.discardedIndex).toBe(0);
        expect(r.newTotal).toBe(7); // 13 - 5 - 1
    });

    it('handles a single base die', () => {
        const dice = [{ result: 4, active: true }];
        const r = computeWildDieReduction(dice, 5); // 4 + 1
        expect(r.discardedIndex).toBe(0);
        expect(r.newTotal).toBe(0); // 5 - 4 - 1
    });
});

describe('resolveRollMode', () => {
    it('defaults to publicroll for non-GM with no explicit choice', () => {
        expect(resolveRollMode({ isGM: false, hideGmRolls: false })).toBe('publicroll');
        expect(resolveRollMode({ isGM: false, hideGmRolls: true })).toBe('publicroll');
    });

    it('switches to gmroll for a GM with hide-gm-rolls enabled', () => {
        expect(resolveRollMode({ isGM: true, hideGmRolls: true })).toBe('gmroll');
    });

    it('stays publicroll for a GM without hide-gm-rolls', () => {
        expect(resolveRollMode({ isGM: true, hideGmRolls: false })).toBe('publicroll');
    });

    it('explicit dialog choice always wins over hide-gm-rolls', () => {
        // Pin the contract for issue #77's footer mode selector: even a GM
        // who has hide-gm-rolls on can still pick publicroll/blindroll/selfroll
        // and have it stick.
        expect(resolveRollMode({ explicit: 'publicroll', isGM: true, hideGmRolls: true })).toBe('publicroll');
        expect(resolveRollMode({ explicit: 'blindroll',  isGM: true, hideGmRolls: true })).toBe('blindroll');
        expect(resolveRollMode({ explicit: 'selfroll',   isGM: true, hideGmRolls: true })).toBe('selfroll');
        expect(resolveRollMode({ explicit: 'gmroll',     isGM: false, hideGmRolls: false })).toBe('gmroll');
    });

    it('treats empty/null explicit as no choice', () => {
        expect(resolveRollMode({ explicit: '', isGM: true, hideGmRolls: true })).toBe('gmroll');
        expect(resolveRollMode({ explicit: null, isGM: false, hideGmRolls: false })).toBe('publicroll');
    });
});
