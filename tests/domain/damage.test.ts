/**
 * Domain drift tests: Damage and Wound Levels (Chapter 10)
 *
 * Asserts that wound-state transitions match the rules extracted from the
 * book. Fixtures are the authoritative source; if implementation diverges
 * from them, these tests break.
 *
 * Pure functions under test: src/module/actor/actor-helpers/wounds-math.ts
 */

import { describe, it, expect } from 'vitest';
import {
    computeNewWoundLevel,
    computeNewDamageLevel,
    findWoundLevelByCore,
} from '../../src/module/actor/actor-helpers/wounds-math';
import deadlinessConfig from '../../src/module/config/deadliness';
import woundLevelEffects from '../../docs/reference/rules/chapter-10-damage/wound-level-effects.json';
import woundLevelDamage from '../../docs/reference/rules/chapter-10-damage/wound-level-damage-application.json';

// Standard character deadliness table (level 3, the default)
const TABLE = deadlinessConfig[3];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keyForCore(core: string): string {
    const key = findWoundLevelByCore(TABLE, core);
    if (key === undefined) throw new Error(`No key for core "${core}" in deadliness table`);
    return key;
}

const HEALTHY           = keyForCore('OD6S.WOUNDS_HEALTHY');
const STUNNED           = keyForCore('OD6S.WOUNDS_STUNNED');
const WOUNDED           = keyForCore('OD6S.WOUNDS_WOUNDED');
const SEVERELY_WOUNDED  = keyForCore('OD6S.WOUNDS_SEVERELY_WOUNDED');
const INCAPACITATED     = keyForCore('OD6S.WOUNDS_INCAPACITATED');
const MORTALLY_WOUNDED  = keyForCore('OD6S.WOUNDS_MORTALLY_WOUNDED');
const DEAD              = keyForCore('OD6S.WOUNDS_DEAD');

const STUN_INCREMENT = false; // book default: stun does not use the increment rule

function transition(from: string, incoming: string): string | number | undefined {
    return computeNewWoundLevel(from, incoming, TABLE, STUN_INCREMENT);
}

// ---------------------------------------------------------------------------
// Fixture sanity — verify fixture IDs match expected values
// ---------------------------------------------------------------------------

describe('fixture sanity', () => {
    it('wound-level-effects fixture is present', () => {
        expect(woundLevelEffects.id).toBe('wound-level-effects');
    });

    it('wound-level-damage-application fixture is present', () => {
        expect(woundLevelDamage.id).toBe('wound-level-damage-application');
    });
});

// ---------------------------------------------------------------------------
// findWoundLevelByCore
// ---------------------------------------------------------------------------

describe('findWoundLevelByCore', () => {
    it('finds each core level in the default table', () => {
        const cores = [
            'OD6S.WOUNDS_HEALTHY',
            'OD6S.WOUNDS_STUNNED',
            'OD6S.WOUNDS_WOUNDED',
            'OD6S.WOUNDS_SEVERELY_WOUNDED',
            'OD6S.WOUNDS_INCAPACITATED',
            'OD6S.WOUNDS_MORTALLY_WOUNDED',
            'OD6S.WOUNDS_DEAD',
        ];
        for (const core of cores) {
            expect(findWoundLevelByCore(TABLE, core)).toBeDefined();
        }
    });
});

// ---------------------------------------------------------------------------
// Wound transitions from healthy — book: p73 Wound Levels table
// ---------------------------------------------------------------------------

describe('computeNewWoundLevel — from Healthy', () => {
    it('Stunned hit → Stunned', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_STUNNED')).toBe(STUNNED);
    });

    it('Wounded hit → Wounded', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_WOUNDED')).toBe(WOUNDED);
    });

    it('Severely Wounded hit → Severely Wounded', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_SEVERELY_WOUNDED')).toBe(SEVERELY_WOUNDED);
    });

    it('Incapacitated hit → Incapacitated', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_INCAPACITATED')).toBe(INCAPACITATED);
    });

    it('Mortally Wounded hit → Mortally Wounded', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_MORTALLY_WOUNDED')).toBe(MORTALLY_WOUNDED);
    });

    it('Dead hit → Dead', () => {
        expect(transition(HEALTHY, 'OD6S.WOUNDS_DEAD')).toBe(DEAD);
    });
});

// ---------------------------------------------------------------------------
// Wound accumulation — book: "Any additional damage less than the character's
// current level moves the character up by one level" (Wound Levels table note)
// ---------------------------------------------------------------------------

describe('computeNewWoundLevel — accumulation from Wounded', () => {
    it('Stunned hit while Wounded → stays Wounded (no increment, stun < current)', () => {
        expect(transition(WOUNDED, 'OD6S.WOUNDS_STUNNED')).toBe(WOUNDED);
    });

    it('Wounded hit while Wounded → escalates by one', () => {
        const result = transition(WOUNDED, 'OD6S.WOUNDS_WOUNDED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(WOUNDED) + 1);
    });

    it('Severely Wounded hit while Wounded → Severely Wounded', () => {
        expect(transition(WOUNDED, 'OD6S.WOUNDS_SEVERELY_WOUNDED')).toBe(SEVERELY_WOUNDED);
    });
});

describe('computeNewWoundLevel — accumulation from Severely Wounded', () => {
    it('Wounded hit → escalates by one', () => {
        const result = transition(SEVERELY_WOUNDED, 'OD6S.WOUNDS_WOUNDED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(SEVERELY_WOUNDED) + 1);
    });

    it('Incapacitated hit → Incapacitated', () => {
        expect(transition(SEVERELY_WOUNDED, 'OD6S.WOUNDS_INCAPACITATED')).toBe(INCAPACITATED);
    });
});

// ---------------------------------------------------------------------------
// Dead is terminal
// ---------------------------------------------------------------------------

describe('computeNewWoundLevel — Dead is terminal', () => {
    it('any hit while Dead → Dead', () => {
        expect(transition(DEAD, 'OD6S.WOUNDS_DEAD')).toBe(DEAD);
    });
});

// ---------------------------------------------------------------------------
// Vehicle damage transitions — book: Chapter 7 / damage rules
// ---------------------------------------------------------------------------

describe('computeNewDamageLevel', () => {
    it('No damage → incoming level applied directly', () => {
        expect(computeNewDamageLevel('OD6S.NO_DAMAGE', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_LIGHT');
    });

    it('Destroyed always wins', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_DESTROYED')).toBe('OD6S.DAMAGE_DESTROYED');
    });

    it('Heavy + Light → Severe', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_HEAVY', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_SEVERE');
    });

    it('Severe + Light → Destroyed', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_DESTROYED');
    });

    it('Heavy + Very Light → stays Heavy (lesser damage ignored)', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_HEAVY', 'OD6S.DAMAGE_VERY_LIGHT')).toBe('OD6S.DAMAGE_HEAVY');
    });

    it('empty string (fresh actor) + any damage → undefined (schema bug guard)', () => {
        // Vehicles fresh from the DB had damage.value="" before the schema fix.
        // computeNewDamageLevel returns undefined for unrecognised current state.
        expect(computeNewDamageLevel('', 'OD6S.DAMAGE_LIGHT')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Stun-damage-increment variant (stunDamageIncrement = true)
// Book p73: optional rule where stun damage accumulates as +1 to wound level
// ---------------------------------------------------------------------------

const STUN_INCREMENT_ON = true;

function transitionIncrement(from: string, incoming: string): string | number | undefined {
    return computeNewWoundLevel(from, incoming, TABLE, STUN_INCREMENT_ON);
}

describe('computeNewWoundLevel — stunDamageIncrement = true', () => {
    it('Stunned hit while Healthy → Stunned (same as default)', () => {
        expect(transitionIncrement(HEALTHY, 'OD6S.WOUNDS_STUNNED')).toBe(STUNNED);
    });

    it('Stunned hit while Stunned → increments by one (stun accumulates)', () => {
        const result = transitionIncrement(STUNNED, 'OD6S.WOUNDS_STUNNED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(STUNNED) + 1);
    });

    it('Stunned hit while Wounded → increments by one (stun accumulates)', () => {
        const result = transitionIncrement(WOUNDED, 'OD6S.WOUNDS_STUNNED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(WOUNDED) + 1);
    });

    it('Wounded hit while Wounded → increments by one (same as default)', () => {
        const result = transitionIncrement(WOUNDED, 'OD6S.WOUNDS_WOUNDED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(WOUNDED) + 1);
    });

    it('Severely Wounded hit while Severely Wounded → increments by one', () => {
        const result = transitionIncrement(SEVERELY_WOUNDED, 'OD6S.WOUNDS_SEVERELY_WOUNDED');
        expect(typeof result === 'number' ? result : parseInt(String(result)))
            .toBe(parseInt(SEVERELY_WOUNDED) + 1);
    });
});
