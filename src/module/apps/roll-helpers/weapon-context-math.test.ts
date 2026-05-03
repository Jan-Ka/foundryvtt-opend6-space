import { describe, it, expect } from 'vitest';
import {
    applyWeaponMods,
    computeStunFlags,
    buildDamagedWeaponModifier,
    buildStrengthDamageModifier,
    type ModTotals,
    type WeaponDamageEntry,
} from './weapon-context-math';

describe('applyWeaponMods', () => {
    const base: ModTotals = { damageScore: 10, miscMod: 0, bonusmod: 5 };

    it('returns base unchanged when all mods are zero', () => {
        expect(applyWeaponMods(base, { damage: 0, difficulty: 0, attack: 0 })).toEqual(base);
    });

    it('adds damage mod into damageScore', () => {
        expect(applyWeaponMods(base, { damage: 3, difficulty: 0, attack: 0 }).damageScore).toBe(13);
    });

    it('adds difficulty mod into miscMod', () => {
        expect(applyWeaponMods(base, { damage: 0, difficulty: 2, attack: 0 }).miscMod).toBe(2);
    });

    it('adds attack mod into bonusmod', () => {
        expect(applyWeaponMods(base, { damage: 0, difficulty: 0, attack: 4 }).bonusmod).toBe(9);
    });

    it('adds negative mods', () => {
        const result = applyWeaponMods(base, { damage: -2, difficulty: -1, attack: -3 });
        expect(result).toEqual({ damageScore: 8, miscMod: -1, bonusmod: 2 });
    });

    it('does not mutate the input', () => {
        const input = { ...base };
        applyWeaponMods(input, { damage: 5, difficulty: 5, attack: 5 });
        expect(input).toEqual(base);
    });
});

describe('computeStunFlags', () => {
    const baseInput = {
        stunOnly: false,
        weaponStunScore: 0,
        isExplosive: false,
        explosiveZonesEnabled: false,
        blastZone1StunDamage: 0,
    };

    it('non-explosive: canStun follows stun.score > 0', () => {
        expect(computeStunFlags({ ...baseInput, weaponStunScore: 3 })).toEqual({ onlyStun: false, canStun: true });
        expect(computeStunFlags({ ...baseInput, weaponStunScore: 0 })).toEqual({ onlyStun: false, canStun: false });
    });

    it('non-explosive: stun_only forces canStun true even when score is 0', () => {
        expect(computeStunFlags({ ...baseInput, stunOnly: true, weaponStunScore: 0 }))
            .toEqual({ onlyStun: true, canStun: true });
    });

    it('explosive with zones: canStun follows blast_radius["1"].stun_damage', () => {
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: true, blastZone1StunDamage: 2,
        })).toEqual({ onlyStun: false, canStun: true });
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: true, blastZone1StunDamage: 0,
        })).toEqual({ onlyStun: false, canStun: false });
    });

    it('explosive without zones: canStun follows stun.score (was previously stun.damage typo)', () => {
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: false, weaponStunScore: 4,
        })).toEqual({ onlyStun: false, canStun: true });
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: false, weaponStunScore: 0,
        })).toEqual({ onlyStun: false, canStun: false });
    });

    it('explosive: stun_only always forces canStun true', () => {
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: true, stunOnly: true,
        }).canStun).toBe(true);
        expect(computeStunFlags({
            ...baseInput, isExplosive: true, explosiveZonesEnabled: false, stunOnly: true,
        }).canStun).toBe(true);
    });

    it('coerces undefined stunOnly to a strict boolean', () => {
        const result = computeStunFlags({ ...baseInput, stunOnly: undefined, weaponStunScore: 2 });
        expect(result.onlyStun).toBe(false);
        expect(result.canStun).toBe(true);
    });
});

describe('buildDamagedWeaponModifier', () => {
    const table: Record<number, WeaponDamageEntry> = {
        1: { penalty: 1, label: 'OD6S.WEAPON_DAMAGED_LIGHT' },
        2: { penalty: 3, label: 'OD6S.WEAPON_DAMAGED_HEAVY' },
    };

    it('returns null when undamaged', () => {
        expect(buildDamagedWeaponModifier(0, table)).toBeNull();
    });

    it('returns null when the level is missing from the table', () => {
        expect(buildDamagedWeaponModifier(99, table)).toBeNull();
    });

    it('returns negated penalty as the modifier value', () => {
        expect(buildDamagedWeaponModifier(1, table)).toEqual({
            name: 'OD6S.WEAPON_DAMAGED', value: -1, level: 'OD6S.WEAPON_DAMAGED_LIGHT',
        });
        expect(buildDamagedWeaponModifier(2, table)).toEqual({
            name: 'OD6S.WEAPON_DAMAGED', value: -3, level: 'OD6S.WEAPON_DAMAGED_HEAVY',
        });
    });
});

describe('buildStrengthDamageModifier', () => {
    it('produces a modifier carrying the strength damage score', () => {
        expect(buildStrengthDamageModifier(5)).toEqual({
            name: 'OD6S.STRENGTH_DAMAGE_BONUS', value: 5,
        });
    });
});
