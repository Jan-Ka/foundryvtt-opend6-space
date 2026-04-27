/**
 * Domain drift tests: Wound / Injury Lookup (Chapters 10 & 6)
 *
 * Verifies that the penalty lookup, level lookup, and injury classification
 * functions return values consistent with the deadliness and damage config tables.
 *
 * Pure functions under test: src/module/system/utilities/wounds.ts
 * Config under test:         src/module/config/deadliness.ts
 *                            src/module/config/damage.ts
 */

import { describe, it, expect } from 'vitest';
import {
    lookupWoundPenalty,
    lookupWoundLevel,
    lookupInjury,
} from '../../src/module/system/utilities/wounds';
import deadlinessConfig from '../../src/module/config/deadliness';
import { damage, vehicleDamage } from '../../src/module/config/damage';

// ---------------------------------------------------------------------------
// lookupWoundPenalty — deadliness level 3 (standard)
// ---------------------------------------------------------------------------

describe('lookupWoundPenalty — deadliness 3', () => {
    const TABLE = deadlinessConfig[3];

    it('Healthy (0) → no penalty', () => {
        expect(lookupWoundPenalty(TABLE, 0)).toBe(0);
    });

    it('Stunned (1) → no penalty', () => {
        expect(lookupWoundPenalty(TABLE, 1)).toBe(0);
    });

    it('Wounded (2) → -1D penalty', () => {
        expect(lookupWoundPenalty(TABLE, 2)).toBe(1);
    });

    it('Severely Wounded (3) → -2D penalty', () => {
        expect(lookupWoundPenalty(TABLE, 3)).toBe(2);
    });

    it('Incapacitated (4) → -3D penalty', () => {
        expect(lookupWoundPenalty(TABLE, 4)).toBe(3);
    });

    it('Mortally Wounded (5) → no penalty (incapacitated state)', () => {
        expect(lookupWoundPenalty(TABLE, 5)).toBe(0);
    });

    it('Dead (6) → no penalty', () => {
        expect(lookupWoundPenalty(TABLE, 6)).toBe(0);
    });

    it('missing entry → 0 (default)', () => {
        expect(lookupWoundPenalty(TABLE, 99)).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// lookupWoundPenalty — all 5 deadliness tables have a Healthy entry at 0
// ---------------------------------------------------------------------------

describe('lookupWoundPenalty — Healthy is always 0 across all tables', () => {
    for (let level = 1; level <= 5; level++) {
        it(`deadliness ${level}: wound 0 → penalty 0`, () => {
            expect(lookupWoundPenalty(deadlinessConfig[level], 0)).toBe(0);
        });
    }
});

// ---------------------------------------------------------------------------
// lookupWoundLevel — deadliness level 3
// ---------------------------------------------------------------------------

describe('lookupWoundLevel — deadliness 3', () => {
    const TABLE = deadlinessConfig[3];

    it('wound 0 → OD6S.WOUNDS_HEALTHY', () => {
        expect(lookupWoundLevel(TABLE, 0)).toBe('OD6S.WOUNDS_HEALTHY');
    });

    it('wound 1 → OD6S.WOUNDS_STUNNED', () => {
        expect(lookupWoundLevel(TABLE, 1)).toBe('OD6S.WOUNDS_STUNNED');
    });

    it('wound 2 → OD6S.WOUNDS_WOUNDED', () => {
        expect(lookupWoundLevel(TABLE, 2)).toBe('OD6S.WOUNDS_WOUNDED');
    });

    it('wound 3 → OD6S.WOUNDS_SEVERELY_WOUNDED', () => {
        expect(lookupWoundLevel(TABLE, 3)).toBe('OD6S.WOUNDS_SEVERELY_WOUNDED');
    });

    it('wound 4 → OD6S.WOUNDS_INCAPACITATED', () => {
        expect(lookupWoundLevel(TABLE, 4)).toBe('OD6S.WOUNDS_INCAPACITATED');
    });

    it('wound 5 → OD6S.WOUNDS_MORTALLY_WOUNDED', () => {
        expect(lookupWoundLevel(TABLE, 5)).toBe('OD6S.WOUNDS_MORTALLY_WOUNDED');
    });

    it('wound 6 → OD6S.WOUNDS_DEAD', () => {
        expect(lookupWoundLevel(TABLE, 6)).toBe('OD6S.WOUNDS_DEAD');
    });

    it('missing entry → empty string (default)', () => {
        expect(lookupWoundLevel(TABLE, 99)).toBe('');
    });
});

// ---------------------------------------------------------------------------
// lookupWoundLevel — deadliness 4 skips Stunned (harsher table)
// ---------------------------------------------------------------------------

describe('lookupWoundLevel — deadliness 4 (no Stunned level)', () => {
    const TABLE = deadlinessConfig[4];

    it('wound 0 → OD6S.WOUNDS_HEALTHY', () => {
        expect(lookupWoundLevel(TABLE, 0)).toBe('OD6S.WOUNDS_HEALTHY');
    });

    it('wound 1 → OD6S.WOUNDS_WOUNDED (no stunned step)', () => {
        expect(lookupWoundLevel(TABLE, 1)).toBe('OD6S.WOUNDS_WOUNDED');
    });
});

// ---------------------------------------------------------------------------
// lookupInjury — personal damage (isVehicle = false)
// Book: damage thresholds from src/module/config/damage.ts
// ---------------------------------------------------------------------------

describe('lookupInjury — personal damage', () => {
    it('damage 0 → no wound (below Stunned threshold)', () => {
        expect(lookupInjury(0, damage, false)).toBe('');
    });

    it('damage 1 → OD6S.WOUNDS_STUNNED (at threshold)', () => {
        expect(lookupInjury(1, damage, false)).toBe('OD6S.WOUNDS_STUNNED');
    });

    it('damage 3 → OD6S.WOUNDS_STUNNED (between Stunned and Wounded)', () => {
        expect(lookupInjury(3, damage, false)).toBe('OD6S.WOUNDS_STUNNED');
    });

    it('damage 4 → OD6S.WOUNDS_WOUNDED (at threshold)', () => {
        expect(lookupInjury(4, damage, false)).toBe('OD6S.WOUNDS_WOUNDED');
    });

    it('damage 8 → OD6S.WOUNDS_WOUNDED (below Incapacitated)', () => {
        expect(lookupInjury(8, damage, false)).toBe('OD6S.WOUNDS_WOUNDED');
    });

    it('damage 9 → OD6S.WOUNDS_INCAPACITATED (at threshold)', () => {
        expect(lookupInjury(9, damage, false)).toBe('OD6S.WOUNDS_INCAPACITATED');
    });

    it('damage 13 → OD6S.WOUNDS_MORTALLY_WOUNDED (at threshold)', () => {
        expect(lookupInjury(13, damage, false)).toBe('OD6S.WOUNDS_MORTALLY_WOUNDED');
    });

    it('damage 16 → OD6S.WOUNDS_DEAD (at threshold)', () => {
        expect(lookupInjury(16, damage, false)).toBe('OD6S.WOUNDS_DEAD');
    });

    it('damage 20 → OD6S.WOUNDS_DEAD (above Dead threshold)', () => {
        expect(lookupInjury(20, damage, false)).toBe('OD6S.WOUNDS_DEAD');
    });
});

// ---------------------------------------------------------------------------
// lookupInjury — vehicle damage (isVehicle = true)
// ---------------------------------------------------------------------------

describe('lookupInjury — vehicle damage', () => {
    it('damage 0 → OD6S.NO_DAMAGE', () => {
        expect(lookupInjury(0, vehicleDamage, true)).toBe('OD6S.NO_DAMAGE');
    });

    it('damage 1 → OD6S.DAMAGE_VERY_LIGHT', () => {
        expect(lookupInjury(1, vehicleDamage, true)).toBe('OD6S.DAMAGE_VERY_LIGHT');
    });

    it('damage 4 → OD6S.DAMAGE_LIGHT', () => {
        expect(lookupInjury(4, vehicleDamage, true)).toBe('OD6S.DAMAGE_LIGHT');
    });

    it('damage 9 → OD6S.DAMAGE_HEAVY', () => {
        expect(lookupInjury(9, vehicleDamage, true)).toBe('OD6S.DAMAGE_HEAVY');
    });

    it('damage 13 → OD6S.DAMAGE_SEVERE', () => {
        expect(lookupInjury(13, vehicleDamage, true)).toBe('OD6S.DAMAGE_SEVERE');
    });

    it('damage 16 → OD6S.DAMAGE_DESTROYED', () => {
        expect(lookupInjury(16, vehicleDamage, true)).toBe('OD6S.DAMAGE_DESTROYED');
    });
});
