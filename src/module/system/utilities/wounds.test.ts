import { describe, it, expect } from 'vitest';
import { lookupWoundPenalty, lookupWoundLevel, lookupInjury } from './wounds';

// Standard deadliness table (level 3 — default OpenD6 Space)
const deadliness3 = {
    0: { description: "Healthy", penalty: 0, core: "OD6S.WOUNDS_HEALTHY" },
    1: { description: "Stunned", penalty: 0, core: "OD6S.WOUNDS_STUNNED" },
    2: { description: "Wounded", penalty: 1, core: "OD6S.WOUNDS_WOUNDED" },
    3: { description: "Severely Wounded", penalty: 2, core: "OD6S.WOUNDS_SEVERELY_WOUNDED" },
    4: { description: "Incapacitated", penalty: 3, core: "OD6S.WOUNDS_INCAPACITATED" },
    5: { description: "Mortally Wounded", penalty: 0, core: "OD6S.WOUNDS_MORTALLY_WOUNDED" },
    6: { description: "Dead", penalty: 0, core: "OD6S.WOUNDS_DEAD" },
};

const characterDamageTable: Record<string, number> = {
    "OD6S.WOUNDS_STUNNED": 1,
    "OD6S.WOUNDS_WOUNDED": 4,
    "OD6S.WOUNDS_INCAPACITATED": 9,
    "OD6S.WOUNDS_MORTALLY_WOUNDED": 13,
    "OD6S.WOUNDS_DEAD": 16,
};

const vehicleDamageTable: Record<string, { damage: number }> = {
    "OD6S.NO_DAMAGE": { damage: 0 },
    "OD6S.DAMAGE_VERY_LIGHT": { damage: 1 },
    "OD6S.DAMAGE_LIGHT": { damage: 4 },
    "OD6S.DAMAGE_HEAVY": { damage: 9 },
    "OD6S.DAMAGE_SEVERE": { damage: 13 },
    "OD6S.DAMAGE_DESTROYED": { damage: 16 },
};

describe('lookupWoundPenalty', () => {
    it('returns 0 for healthy (wound level 0)', () => {
        expect(lookupWoundPenalty(deadliness3, 0)).toBe(0);
    });

    it('returns 0 for stunned (wound level 1)', () => {
        expect(lookupWoundPenalty(deadliness3, 1)).toBe(0);
    });

    it('returns 1 for wounded (wound level 2)', () => {
        expect(lookupWoundPenalty(deadliness3, 2)).toBe(1);
    });

    it('returns 2 for severely wounded (wound level 3)', () => {
        expect(lookupWoundPenalty(deadliness3, 3)).toBe(2);
    });

    it('returns 3 for incapacitated (wound level 4)', () => {
        expect(lookupWoundPenalty(deadliness3, 4)).toBe(3);
    });

    it('returns 0 for unknown wound level', () => {
        expect(lookupWoundPenalty(deadliness3, 99)).toBe(0);
    });
});

describe('lookupWoundLevel', () => {
    it('returns healthy core for wound value 0', () => {
        expect(lookupWoundLevel(deadliness3, 0)).toBe("OD6S.WOUNDS_HEALTHY");
    });

    it('returns wounded core for wound value 2', () => {
        expect(lookupWoundLevel(deadliness3, 2)).toBe("OD6S.WOUNDS_WOUNDED");
    });

    it('returns dead core for wound value 6', () => {
        expect(lookupWoundLevel(deadliness3, 6)).toBe("OD6S.WOUNDS_DEAD");
    });

    it('returns empty string for unknown wound value', () => {
        expect(lookupWoundLevel(deadliness3, 99)).toBe('');
    });
});

describe('lookupInjury', () => {
    describe('character damage', () => {
        it('returns empty for 0 damage', () => {
            expect(lookupInjury(0, characterDamageTable, false)).toBe('');
        });

        it('returns stunned for 1 damage', () => {
            expect(lookupInjury(1, characterDamageTable, false)).toBe("OD6S.WOUNDS_STUNNED");
        });

        it('returns wounded for 4 damage', () => {
            expect(lookupInjury(4, characterDamageTable, false)).toBe("OD6S.WOUNDS_WOUNDED");
        });

        it('returns wounded for 7 damage (between thresholds)', () => {
            expect(lookupInjury(7, characterDamageTable, false)).toBe("OD6S.WOUNDS_WOUNDED");
        });

        it('returns incapacitated for 9 damage', () => {
            expect(lookupInjury(9, characterDamageTable, false)).toBe("OD6S.WOUNDS_INCAPACITATED");
        });

        it('returns dead for 20 damage', () => {
            expect(lookupInjury(20, characterDamageTable, false)).toBe("OD6S.WOUNDS_DEAD");
        });
    });

    describe('vehicle damage', () => {
        it('returns no damage for 0', () => {
            expect(lookupInjury(0, vehicleDamageTable, true)).toBe("OD6S.NO_DAMAGE");
        });

        it('returns light for 5 damage', () => {
            expect(lookupInjury(5, vehicleDamageTable, true)).toBe("OD6S.DAMAGE_LIGHT");
        });

        it('returns destroyed for 16+ damage', () => {
            expect(lookupInjury(20, vehicleDamageTable, true)).toBe("OD6S.DAMAGE_DESTROYED");
        });
    });
});
