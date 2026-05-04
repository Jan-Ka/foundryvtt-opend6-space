/**
 * Domain tests — weapon family roll handlers (#98 phase 1).
 *
 * Covers weapon, starship-weapon, vehicle-weapon. The three share the
 * same bucket logic; vehicle-weapon adds a `vehicle` field for the actor's
 * vehicle uuid.
 *
 * Bucket-owned outputs:
 *   damagetype, damagescore, stundamagetype, stundamagescore,
 *   damagemodifiers, source, range, difficultylevel,
 *   only_stun, can_stun, stun, attackerScale, specSkill
 *
 * Cross-cutting math (penalty math, bonusmod accumulation, dice/pips
 * assembly, fp-effect doubling) lives on COMMON and is not under test here.
 *
 * Rules referenced (ids only):
 *   weapon          — attacking-and-defending, base-combat-difficulty,
 *                     combat-difficulty-modifiers-range,
 *                     step-3-determining-damage, determining-strength-damage
 *   starship-weapon — scale, step-3-determining-damage,
 *                     combat-difficulty-modifiers-range, ship-weapons
 *   vehicle-weapon  — scale, step-3-determining-damage,
 *                     combat-difficulty-modifiers-range, vehicle-damage
 */

import { describe, expect, it } from 'vitest';
import { HANDLERS } from '../../src/module/apps/roll-helpers/roll-handlers';
import type {
    ActorView,
    HandlerContext,
    HandlerInput,
    ItemView,
    RollSettingsView,
} from '../../src/module/apps/roll-helpers/roll-handlers';
import type { RollTypeKey } from '../../src/module/apps/roll-helpers/roll-data';

type WeaponKey = 'weapon' | 'starship-weapon' | 'vehicle-weapon';

const noMods = { damage: 0, attack: 0, difficulty: 0 };

function makeSettings(overrides: Partial<RollSettingsView> = {}): RollSettingsView {
    return {
        defaultUnknownDifficulty: false,
        diceForScale: false,
        fundsFate: false,
        hideCombatCards: false,
        hideSkillCards: false,
        showSkillSpecialization: true,
        pipsPerDice: 3,
        meleeDifficulty: false,
        explosiveZones: false,
        weaponDamageTable: {
            1: { penalty: 3, label: 'OD6S.WEAPON_DAMAGED_LIGHT' },
            2: { penalty: 6, label: 'OD6S.WEAPON_DAMAGED_HEAVY' },
        },
        ...overrides,
    };
}

function makeCtx(
    item: ItemView,
    actor: ActorView = { type: 'character', uuid: 'Actor.x' },
    settings?: Partial<RollSettingsView>,
): HandlerContext {
    return {
        actor,
        item,
        targets: [],
        settings: makeSettings(settings),
        localize: (key: string) => key,
    };
}

function makeInput(key: WeaponKey, name: string, subtype = ''): HandlerInput {
    return {
        classified: { type: key, subtype, key: key as RollTypeKey },
        name,
        score: 0,
        type: key,
        subtype,
        itemId: 'Item.x',
    };
}

function basicRangedWeapon(overrides: Partial<ItemView> = {}): ItemView {
    return {
        type: 'weapon',
        name: 'Test Blaster',
        damage: { type: 'e', score: 12 },
        range: { short: 10, medium: 30, long: 60 },
        mods: noMods,
        ...overrides,
    };
}

describe('weapon handler — happy path', () => {
    it('passes through damage type, score, source from the weapon item; emits the rules-default range label (resolution to a distance-based bucket happens downstream)', () => {
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'Test Blaster'),
            makeCtx(basicRangedWeapon()),
        );
        expect(out.damagetype).toBe('e');
        expect(out.damagescore).toBe(12);
        expect(out.source).toBe('Test Blaster');
        expect(out.range).toBe('OD6S.RANGE_SHORT_SHORT');
    });

    it('emits the point-blank range label for melee subtype', () => {
        const melee = basicRangedWeapon({ range: false });
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'X', 'meleeattack'),
            makeCtx(melee),
        );
        expect(out.range).toBe('OD6S.RANGE_POINT_BLANK_SHORT');
    });

    it('uses weapon scale when truthy, falling back to actor scale when 0/undefined', () => {
        const withScale = basicRangedWeapon({ scale: { score: 6 } });
        const noWeaponScale = basicRangedWeapon();
        const zeroWeaponScale = basicRangedWeapon({ scale: { score: 0 } });
        const actorWithScale: ActorView = { type: 'character', uuid: 'Actor.x', scale: { score: 3 } };

        expect(HANDLERS['weapon'](makeInput('weapon', 'A'), makeCtx(withScale, actorWithScale)).attackerScale).toBe(6);
        // Weapon scale missing — fall back to actor.
        expect(HANDLERS['weapon'](makeInput('weapon', 'B'), makeCtx(noWeaponScale, actorWithScale)).attackerScale).toBe(3);
        // Weapon scale explicitly 0 — also fall back to actor (truthy guard).
        expect(HANDLERS['weapon'](makeInput('weapon', 'C'), makeCtx(zeroWeaponScale, actorWithScale)).attackerScale).toBe(3);
        // Both 0 — expected 0.
        expect(HANDLERS['weapon'](makeInput('weapon', 'D'), makeCtx(noWeaponScale)).attackerScale).toBe(0);
    });
});

describe('weapon handler — melee damage with strength', () => {
    it('adds actor strength damage to weapon damage when weapon.damage.str is true (melee subtype)', () => {
        const meleeStr = basicRangedWeapon({
            name: 'Vibroblade',
            damage: { type: 'p', score: 9, str: true },
            range: false,
        });
        const actor: ActorView = { type: 'character', uuid: 'Actor.x', strengthDamage: 6 };
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'Vibroblade', 'meleeattack'),
            makeCtx(meleeStr, actor),
        );
        expect(out.damagescore).toBe(15);
    });

    it('does not add strength damage for non-str weapons or non-melee subtypes', () => {
        const meleeNoStr = basicRangedWeapon({
            damage: { type: 'p', score: 9 },
            range: false,
        });
        const actor: ActorView = { type: 'character', uuid: 'Actor.x', strengthDamage: 6 };
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'X', 'meleeattack'),
            makeCtx(meleeNoStr, actor),
        );
        expect(out.damagescore).toBe(9);
    });
});

describe('weapon handler — stun flags', () => {
    it('reports can_stun true when weapon has a stun score', () => {
        const stunCapable = basicRangedWeapon({
            stun: { type: 's', score: 9 },
        });
        const out = HANDLERS['weapon'](makeInput('weapon', 'X'), makeCtx(stunCapable));
        expect(out.can_stun).toBe(true);
        expect(out.only_stun).toBe(false);
        expect(out.stundamagescore).toBe(9);
    });

    it('reports only_stun true when weapon has stun_only', () => {
        const stunOnly = basicRangedWeapon({
            stun: { type: 's', score: 9, stun_only: true },
        });
        const out = HANDLERS['weapon'](makeInput('weapon', 'X'), makeCtx(stunOnly));
        expect(out.only_stun).toBe(true);
        expect(out.can_stun).toBe(true);
    });

    it('reports can_stun false when weapon has no stun', () => {
        const out = HANDLERS['weapon'](makeInput('weapon', 'X'), makeCtx(basicRangedWeapon()));
        expect(out.can_stun).toBe(false);
        expect(out.only_stun).toBe(false);
    });

    it('explosive weapon: with zones enabled, can_stun reads blast-zone-1 stun_damage (not weapon.stun.score)', () => {
        const explosiveBlast = basicRangedWeapon({
            isExplosive: true,
            stun: undefined,
            blast_radius: { '1': { stun_damage: 6 } },
        });
        const explosiveNoBlast = basicRangedWeapon({
            isExplosive: true,
            stun: undefined,
            blast_radius: { '1': { stun_damage: 0 } },
        });
        const ctx = (item: ItemView) =>
            makeCtx(item, { type: 'character', uuid: 'Actor.x' }, { explosiveZones: true });

        expect(HANDLERS['weapon'](makeInput('weapon', 'A'), ctx(explosiveBlast)).can_stun).toBe(true);
        expect(HANDLERS['weapon'](makeInput('weapon', 'B'), ctx(explosiveNoBlast)).can_stun).toBe(false);
    });
});

describe('weapon handler — damage modifiers from weapon state', () => {
    it('emits a WEAPON_DAMAGED entry when the weapon is damaged', () => {
        const damaged = basicRangedWeapon({ damaged: 1 });
        const out = HANDLERS['weapon'](makeInput('weapon', 'X'), makeCtx(damaged));
        expect(out.damagemodifiers).toContainEqual(
            expect.objectContaining({ name: 'OD6S.WEAPON_DAMAGED', value: -3 }),
        );
    });

    it('emits a STRENGTH_DAMAGE_BONUS entry when weapon.damage.muscle is set', () => {
        const muscle = basicRangedWeapon({
            damage: { type: 'p', score: 9, muscle: true },
        });
        const actor: ActorView = { type: 'character', uuid: 'Actor.x', strengthDamage: 6 };
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'X'),
            makeCtx(muscle, actor),
        );
        expect(out.damagemodifiers).toContainEqual(
            expect.objectContaining({ name: 'OD6S.STRENGTH_DAMAGE_BONUS', value: 6 }),
        );
    });

    it('emits no damage modifiers when weapon is pristine and not muscle-powered', () => {
        const out = HANDLERS['weapon'](makeInput('weapon', 'X'), makeCtx(basicRangedWeapon()));
        expect(out.damagemodifiers).toEqual([]);
    });
});

describe('weapon handler — difficulty', () => {
    it('uses weapon-authored difficulty when meleeDifficulty setting is on', () => {
        const item = basicRangedWeapon({ difficulty: 'OD6S.DIFFICULTY_MODERATE' });
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'X'),
            makeCtx(item, { type: 'character', uuid: 'Actor.x' }, { meleeDifficulty: true }),
        );
        expect(out.difficultylevel).toBe('OD6S.DIFFICULTY_MODERATE');
    });

    it('falls back to easy when weapon has no authored difficulty (and meleeDifficulty on)', () => {
        const out = HANDLERS['weapon'](
            makeInput('weapon', 'X'),
            makeCtx(basicRangedWeapon(), { type: 'character', uuid: 'Actor.x' }, { meleeDifficulty: true }),
        );
        expect(out.difficultylevel).toBe('OD6S.DIFFICULTY_EASY');
    });
});

describe('vehicle-weapon handler — adds vehicle uuid', () => {
    it('uses the actor uuid when the actor is a vehicle', () => {
        const out = HANDLERS['vehicle-weapon'](
            makeInput('vehicle-weapon', 'Turret'),
            makeCtx(basicRangedWeapon(), { type: 'vehicle', uuid: 'Actor.vehicle-1' }),
        );
        expect(out.vehicle).toBe('Actor.vehicle-1');
    });

    it('uses the embedded vehicle uuid when the actor is a character', () => {
        const out = HANDLERS['vehicle-weapon'](
            makeInput('vehicle-weapon', 'Turret'),
            makeCtx(basicRangedWeapon(), {
                type: 'character',
                uuid: 'Actor.pilot',
                vehicle: { uuid: 'Actor.embedded-vehicle' },
            }),
        );
        expect(out.vehicle).toBe('Actor.embedded-vehicle');
    });
});

describe('starship-weapon handler — same shape as weapon', () => {
    it('produces the same bucket as weapon (no vehicle field)', () => {
        const out = HANDLERS['starship-weapon'](
            makeInput('starship-weapon', 'Cannon'),
            makeCtx(basicRangedWeapon(), { type: 'starship', uuid: 'Actor.starship' }),
        );
        expect(out.damagescore).toBe(12);
        expect(out.source).toBe('Test Blaster');
        expect('vehicle' in out).toBe(false);
    });
});
