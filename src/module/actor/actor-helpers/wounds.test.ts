import { describe, it, expect } from 'vitest';
import {
    findWoundLevelByCore,
    computeNewDamageLevel,
    computeNewWoundLevel,
} from './wounds-math';

// Standard deadliness table 3 — has all wound levels
const deadliness3: Record<string, { core: string; description: string; penalty: number }> = {
    0: { description: 'Healthy', penalty: 0, core: 'OD6S.WOUNDS_HEALTHY' },
    1: { description: 'Stunned', penalty: 0, core: 'OD6S.WOUNDS_STUNNED' },
    2: { description: 'Wounded', penalty: 1, core: 'OD6S.WOUNDS_WOUNDED' },
    3: { description: 'Severely Wounded', penalty: 2, core: 'OD6S.WOUNDS_SEVERELY_WOUNDED' },
    4: { description: 'Incapacitated', penalty: 3, core: 'OD6S.WOUNDS_INCAPACITATED' },
    5: { description: 'Mortally Wounded', penalty: 0, core: 'OD6S.WOUNDS_MORTALLY_WOUNDED' },
    6: { description: 'Dead', penalty: 0, core: 'OD6S.WOUNDS_DEAD' },
};

// Sparse table — no Stunned, no Incapacitated (forces promotion paths)
const deadlinessSparse: Record<string, { core: string; description: string; penalty: number }> = {
    0: { description: 'Healthy', penalty: 0, core: 'OD6S.WOUNDS_HEALTHY' },
    1: { description: 'Wounded', penalty: 1, core: 'OD6S.WOUNDS_WOUNDED' },
    2: { description: 'Mortally Wounded', penalty: 0, core: 'OD6S.WOUNDS_MORTALLY_WOUNDED' },
    3: { description: 'Dead', penalty: 0, core: 'OD6S.WOUNDS_DEAD' },
};

describe('findWoundLevelByCore', () => {
    it('finds the first matching wound level', () => {
        expect(findWoundLevelByCore(deadliness3, 'OD6S.WOUNDS_WOUNDED')).toBe('2');
        expect(findWoundLevelByCore(deadliness3, 'OD6S.WOUNDS_DEAD')).toBe('6');
    });

    it('returns undefined when core is not in table', () => {
        expect(findWoundLevelByCore(deadlinessSparse, 'OD6S.WOUNDS_STUNNED')).toBeUndefined();
        expect(findWoundLevelByCore(deadlinessSparse, 'OD6S.WOUNDS_INCAPACITATED')).toBeUndefined();
    });
});

describe('computeNewDamageLevel', () => {
    it('NO_DAMAGE → any → that damage', () => {
        expect(computeNewDamageLevel('OD6S.NO_DAMAGE', 'OD6S.DAMAGE_VERY_LIGHT')).toBe('OD6S.DAMAGE_VERY_LIGHT');
        expect(computeNewDamageLevel('OD6S.NO_DAMAGE', 'OD6S.DAMAGE_HEAVY')).toBe('OD6S.DAMAGE_HEAVY');
    });

    it('any → DESTROYED → DESTROYED', () => {
        expect(computeNewDamageLevel('OD6S.NO_DAMAGE', 'OD6S.DAMAGE_DESTROYED')).toBe('OD6S.DAMAGE_DESTROYED');
        expect(computeNewDamageLevel('OD6S.DAMAGE_LIGHT', 'OD6S.DAMAGE_DESTROYED')).toBe('OD6S.DAMAGE_DESTROYED');
    });

    it('LIGHT + VERY_LIGHT stays LIGHT', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_LIGHT', 'OD6S.DAMAGE_VERY_LIGHT')).toBe('OD6S.DAMAGE_LIGHT');
    });

    it('LIGHT + LIGHT stays LIGHT', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_LIGHT', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_LIGHT');
    });

    it('LIGHT + HEAVY promotes to HEAVY', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_LIGHT', 'OD6S.DAMAGE_HEAVY')).toBe('OD6S.DAMAGE_HEAVY');
    });

    it('HEAVY + LIGHT or HEAVY promotes to SEVERE', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_HEAVY', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_SEVERE');
        expect(computeNewDamageLevel('OD6S.DAMAGE_HEAVY', 'OD6S.DAMAGE_HEAVY')).toBe('OD6S.DAMAGE_SEVERE');
    });

    it('HEAVY + VERY_LIGHT stays HEAVY', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_HEAVY', 'OD6S.DAMAGE_VERY_LIGHT')).toBe('OD6S.DAMAGE_HEAVY');
    });

    it('SEVERE + LIGHT/HEAVY/SEVERE → DESTROYED', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_LIGHT')).toBe('OD6S.DAMAGE_DESTROYED');
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_HEAVY')).toBe('OD6S.DAMAGE_DESTROYED');
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_SEVERE')).toBe('OD6S.DAMAGE_DESTROYED');
    });

    it('SEVERE + VERY_LIGHT stays SEVERE', () => {
        expect(computeNewDamageLevel('OD6S.DAMAGE_SEVERE', 'OD6S.DAMAGE_VERY_LIGHT')).toBe('OD6S.DAMAGE_SEVERE');
    });
});

describe('computeNewWoundLevel', () => {
    describe('healthy → any wound', () => {
        it('healthy + stunned → stunned (level 1)', () => {
            expect(computeNewWoundLevel('0', 'OD6S.WOUNDS_STUNNED', deadliness3, false)).toBe('1');
        });

        it('healthy + wounded → wounded (level 2)', () => {
            expect(computeNewWoundLevel('0', 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe('2');
        });

        it('healthy + dead → dead (level 6)', () => {
            expect(computeNewWoundLevel('0', 'OD6S.WOUNDS_DEAD', deadliness3, false)).toBe('6');
        });
    });

    describe('promotion in sparse tables', () => {
        it('promotes stunned to wounded when no stunned in table', () => {
            // Healthy (0) + stunned → wounded (1) in sparse table
            expect(computeNewWoundLevel('0', 'OD6S.WOUNDS_STUNNED', deadlinessSparse, false)).toBe('1');
        });

        it('promotes incapacitated to mortally wounded when no incapacitated in table', () => {
            expect(computeNewWoundLevel('0', 'OD6S.WOUNDS_INCAPACITATED', deadlinessSparse, false)).toBe('2');
        });
    });

    describe('dead always finds dead', () => {
        it('any current state + dead → first dead level', () => {
            expect(computeNewWoundLevel('2', 'OD6S.WOUNDS_DEAD', deadliness3, false)).toBe('6');
            expect(computeNewWoundLevel('5', 'OD6S.WOUNDS_DEAD', deadliness3, false)).toBe('6');
        });
    });

    describe('wounded current state', () => {
        it('wounded + stunned (stunDamageIncrement off) stays at current', () => {
            expect(computeNewWoundLevel(2, 'OD6S.WOUNDS_STUNNED', deadliness3, false)).toBe(2);
        });

        it('wounded + stunned (stunDamageIncrement on) increments', () => {
            expect(computeNewWoundLevel(2, 'OD6S.WOUNDS_STUNNED', deadliness3, true)).toBe(3);
        });

        it('wounded + wounded increments', () => {
            expect(computeNewWoundLevel(2, 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe(3);
        });

        it('wounded + severely wounded jumps to first severely', () => {
            expect(computeNewWoundLevel(2, 'OD6S.WOUNDS_SEVERELY_WOUNDED', deadliness3, false)).toBe('3');
        });
    });

    describe('severely wounded current state', () => {
        it('severely + stunned (off) stays', () => {
            expect(computeNewWoundLevel(3, 'OD6S.WOUNDS_STUNNED', deadliness3, false)).toBe(3);
        });

        it('severely + wounded increments', () => {
            expect(computeNewWoundLevel(3, 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe(4);
        });

        it('severely + severely increments', () => {
            expect(computeNewWoundLevel(3, 'OD6S.WOUNDS_SEVERELY_WOUNDED', deadliness3, false)).toBe(4);
        });

        it('severely + incapacitated jumps to first incapacitated', () => {
            expect(computeNewWoundLevel(3, 'OD6S.WOUNDS_INCAPACITATED', deadliness3, false)).toBe('4');
        });
    });

    describe('incapacitated current state', () => {
        it('incapacitated + wounded increments', () => {
            expect(computeNewWoundLevel(4, 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe(5);
        });

        it('incapacitated + mortally jumps to first mortally', () => {
            expect(computeNewWoundLevel(4, 'OD6S.WOUNDS_MORTALLY_WOUNDED', deadliness3, false)).toBe('5');
        });
    });

    describe('mortally wounded current state', () => {
        it('mortally + stunned/wounded/severely (off) stays at current', () => {
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_STUNNED', deadliness3, false)).toBe(5);
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe(5);
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_SEVERELY_WOUNDED', deadliness3, false)).toBe(5);
        });

        it('mortally + stunned (on) increments', () => {
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_STUNNED', deadliness3, true)).toBe(6);
        });

        it('mortally + incapacitated increments', () => {
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_INCAPACITATED', deadliness3, false)).toBe(6);
        });

        it('mortally + mortally increments', () => {
            expect(computeNewWoundLevel(5, 'OD6S.WOUNDS_MORTALLY_WOUNDED', deadliness3, false)).toBe(6);
        });
    });

    describe('stunned current state', () => {
        it('stunned + anything (off) jumps to first matching', () => {
            expect(computeNewWoundLevel(1, 'OD6S.WOUNDS_WOUNDED', deadliness3, false)).toBe('2');
            expect(computeNewWoundLevel(1, 'OD6S.WOUNDS_SEVERELY_WOUNDED', deadliness3, false)).toBe('3');
        });

        it('stunned + anything (on) increments', () => {
            expect(computeNewWoundLevel(1, 'OD6S.WOUNDS_WOUNDED', deadliness3, true)).toBe(2);
            expect(computeNewWoundLevel(1, 'OD6S.WOUNDS_INCAPACITATED', deadliness3, true)).toBe(2);
        });
    });
});
