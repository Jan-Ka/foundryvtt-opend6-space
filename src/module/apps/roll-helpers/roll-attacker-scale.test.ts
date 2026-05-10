/**
 * Unit tests for the attacker-scale helpers extracted from roll-setup.ts.
 *
 * Both helpers are pure: `isAttackRollKey` only inspects the classified
 * key/type, and `deriveAttackerScale` reads `actor.system.scale.score` (or
 * `actor.system.vehicle.scale.score` for character-piloting-vehicle paths).
 * No Foundry globals are touched, so a minimal `as unknown as Actor` shim
 * is enough.
 */

import { describe, it, expect } from 'vitest';
import { deriveAttackerScale, isAttackRollKey } from './roll-attacker-scale';

function characterActor(scaleScore: number, vehicleScaleScore?: number): Actor {
    return {
        type: 'character',
        system: {
            scale: { score: scaleScore },
            vehicle: vehicleScaleScore !== undefined
                ? { scale: { score: vehicleScaleScore } }
                : undefined,
        },
    } as unknown as Actor;
}

function vehicleActor(scaleScore: number): Actor {
    return {
        type: 'vehicle',
        system: { scale: { score: scaleScore } },
    } as unknown as Actor;
}

function unknownActor(): Actor {
    return { type: 'container', system: {} } as unknown as Actor;
}

describe('isAttackRollKey', () => {
    it('returns true for the canonical attack-key set', () => {
        for (const key of [
            'weapon', 'starship-weapon', 'vehicle-weapon',
            'action-brawlattack', 'action-vehicleramattack',
            'action-vehiclerangedweaponattack',
        ] as const) {
            expect(isAttackRollKey(key, 'weapon', false)).toBe(true);
        }
    });

    it('returns true for ranged weapon-classified rolls', () => {
        expect(isAttackRollKey('weapon', 'weapon', true)).toBe(true);
        expect(isAttackRollKey('weapon', 'starship-weapon', true)).toBe(true);
        expect(isAttackRollKey('weapon', 'vehicle-weapon', true)).toBe(true);
    });

    it('returns true for rangedattack / vehiclerangedattack / meleeattack action keys', () => {
        expect(isAttackRollKey('action-rangedattack', 'action', false)).toBe(true);
        expect(isAttackRollKey('action-vehiclerangedattack', 'action', false)).toBe(true);
        expect(isAttackRollKey('action-meleeattack', 'action', false)).toBe(true);
    });

    it('returns false for non-attack action keys', () => {
        expect(isAttackRollKey('action-other', 'action', false)).toBe(false);
        expect(isAttackRollKey('skill-dodge', 'skill', false)).toBe(false);
        expect(isAttackRollKey('skill', 'skill', false)).toBe(false);
        expect(isAttackRollKey('attribute', 'attribute', false)).toBe(false);
    });

    it('does not promote non-weapon classified types to attack via isRangedSubtype', () => {
        expect(isAttackRollKey('skill', 'skill', true)).toBe(false);
        expect(isAttackRollKey('attribute', 'attribute', true)).toBe(false);
    });
});

describe('deriveAttackerScale', () => {
    it('returns the bucket override when it is a non-zero number', () => {
        const actor = characterActor(5);
        expect(deriveAttackerScale({
            actor, subtype: 'meleeattack', isAttackRoll: true, bucketAttackerScale: 3,
        })).toBe(3);
    });

    it('falls through past zero bucket to actor-derived scale on attack rolls', () => {
        const actor = characterActor(7);
        expect(deriveAttackerScale({
            actor, subtype: 'meleeattack', isAttackRoll: true, bucketAttackerScale: 0,
        })).toBe(7);
    });

    it('returns bucket value (0 / undefined) on non-attack rolls without deriving', () => {
        const actor = characterActor(7);
        expect(deriveAttackerScale({
            actor, subtype: 'skill', isAttackRoll: false, bucketAttackerScale: undefined,
        })).toBe(0);
        expect(deriveAttackerScale({
            actor, subtype: 'skill', isAttackRoll: false, bucketAttackerScale: 0,
        })).toBe(0);
    });

    it('reads vehicle actor scale for vehicle-* subtypes', () => {
        const actor = vehicleActor(11);
        expect(deriveAttackerScale({
            actor, subtype: 'vehiclerangedattack', isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(11);
    });

    it('reads character.system.vehicle.scale.score for vehicle-* subtypes piloted by characters', () => {
        const actor = characterActor(2, 9);
        expect(deriveAttackerScale({
            actor, subtype: 'vehiclerangedweaponattack', isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(9);
    });

    it('returns 0 when a character on a vehicle subtype has no embedded vehicle data', () => {
        const actor = characterActor(4);
        expect(deriveAttackerScale({
            actor, subtype: 'vehicleramattack', isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(0);
    });

    it('reads character/vehicle actor scale on non-vehicle attack subtypes', () => {
        expect(deriveAttackerScale({
            actor: characterActor(5), subtype: 'meleeattack',
            isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(5);
        expect(deriveAttackerScale({
            actor: vehicleActor(8), subtype: 'rangedattack',
            isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(8);
    });

    it('returns 0 for unknown actor types on attack rolls', () => {
        expect(deriveAttackerScale({
            actor: unknownActor(), subtype: 'meleeattack',
            isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(0);
    });

    it('coerces missing scale.score to 0', () => {
        const actor = { type: 'character', system: { scale: {} } } as unknown as Actor;
        expect(deriveAttackerScale({
            actor, subtype: 'meleeattack', isAttackRoll: true, bucketAttackerScale: undefined,
        })).toBe(0);
    });
});
