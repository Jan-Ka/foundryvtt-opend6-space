/**
 * Domain tests — action family roll handlers (#98 phase 1).
 *
 * Covers the eight action-* RollTypeKeys. Action handlers vary widely in
 * shape; their bucket-owned outputs split as:
 *
 *   action-attribute                 — score from the named attribute
 *   action-meleeattack               — score (skill-backed), attackerScale,
 *                                       damagescore (= actor.strengthDamage,
 *                                       per the unarmed strike rule)
 *   action-brawlattack               — score (skill-backed), attackerScale,
 *                                       physical damage + stun damage at
 *                                       strength score, can_stun true
 *   action-rangedattack              — score from AGI, attackerScale, default
 *                                       range/difficulty labels
 *   action-vehiclerangedattack       — score from MEC, attackerScale, default
 *                                       range/difficulty labels, vehicle uuid
 *   action-vehiclerangedweaponattack — vehicle weapon item provides damage,
 *                                       weapon mods applied; vehicle uuid
 *   action-vehicleramattack          — physical damage from ramAttackContribution,
 *                                       attackerScale from vehicle, source label
 *   action-other                     — empty fallback
 *
 * RFC #100 outcome: the +5 magic constant on action-meleeattack is removed.
 * The rules-correct meleeattack action damage is just actor.strengthDamage
 * (matching the rule for an unarmed/improvised strike); score comes from
 * the skill-backed action resolution like other skill-backed actions.
 *
 * Rules referenced (ids only):
 *   action-meleeattack               — attacking-and-defending, skill-base-mechanics
 *   action-brawlattack               — attacking-and-defending, step-3-determining-damage,
 *                                       determining-strength-damage
 *   action-rangedattack              — attacking-and-defending,
 *                                       combat-difficulty-modifiers-range,
 *                                       combat-difficulty-modifiers-cover
 *   action-vehiclerangedattack       — scale, combat-difficulty-modifiers-range,
 *                                       vehicle-damage
 *   action-vehiclerangedweaponattack — scale, step-3-determining-damage,
 *                                       combat-difficulty-modifiers-range
 *   action-vehicleramattack          — ramming, scale, vehicle-damage,
 *                                       step-3-determining-damage
 *   action-attribute                 — skill-check, base-combat-difficulty
 *   action-other                     — skill-check (fallback bucket)
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
import type { ActionSkill } from '../../src/module/apps/roll-helpers/action-math';
import type { RollTypeKey } from '../../src/module/apps/roll-helpers/roll-data';

type ActionSubtype =
    | 'attribute' | 'meleeattack' | 'brawlattack'
    | 'rangedattack' | 'vehiclerangedattack' | 'vehiclerangedweaponattack'
    | 'vehicleramattack' | 'other';

const SUBTYPE_TO_KEY: Record<ActionSubtype, RollTypeKey> = {
    attribute: 'action-attribute',
    meleeattack: 'action-meleeattack',
    brawlattack: 'action-brawlattack',
    rangedattack: 'action-rangedattack',
    vehiclerangedattack: 'action-vehiclerangedattack',
    vehiclerangedweaponattack: 'action-vehiclerangedweaponattack',
    vehicleramattack: 'action-vehicleramattack',
    other: 'action-other',
};

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
        weaponDamageTable: {},
        flatSkills: false,
        brawlAttribute: 'str',
        ...overrides,
    };
}

function makeCtx(overrides: Partial<HandlerContext> = {}): HandlerContext {
    return {
        actor: { type: 'character', uuid: 'Actor.x' },
        targets: [],
        settings: makeSettings(),
        localize: (key: string) => key,
        ...overrides,
    };
}

function makeInput(subtype: ActionSubtype, extras: Partial<HandlerInput> = {}): HandlerInput {
    return {
        classified: { type: 'action', subtype, key: SUBTYPE_TO_KEY[subtype] },
        name: '',
        score: 0,
        type: 'action',
        subtype,
        ...extras,
    };
}

const characterWithAttrs = (overrides: Partial<ActorView & { type: 'character' }> = {}): ActorView => ({
    type: 'character',
    uuid: 'Actor.character',
    attributes: { str: { score: 9 }, agi: { score: 12 }, mec: { score: 6 } },
    scale: { score: 0 },
    strengthDamage: 6,
    ...overrides,
} as ActorView);

describe('action-attribute handler', () => {
    it('returns the actor attribute score for the named attribute', () => {
        const out = HANDLERS['action-attribute'](
            makeInput('attribute', { attribute: 'agi' }),
            makeCtx({ actor: characterWithAttrs() }),
        );
        expect(out.score).toBe(12);
    });

    it('returns 0 when the actor has no such attribute', () => {
        const out = HANDLERS['action-attribute'](
            makeInput('attribute', { attribute: 'kno' }),
            makeCtx({ actor: characterWithAttrs() }),
        );
        expect(out.score).toBe(0);
    });
});

describe('action-other handler', () => {
    it('returns an empty bucket — fallback for unrecognized action subtypes', () => {
        const out = HANDLERS['action-other'](
            makeInput('other'),
            makeCtx({ actor: characterWithAttrs() }),
        );
        expect(out).toEqual({});
    });
});

describe('action-rangedattack handler', () => {
    it('uses agility for score and the rules-default short-range / easy difficulty labels', () => {
        const out = HANDLERS['action-rangedattack'](
            makeInput('rangedattack'),
            makeCtx({ actor: characterWithAttrs({ scale: { score: 3 } }) }),
        );
        expect(out.score).toBe(12); // agi
        expect(out.range).toBe('OD6S.RANGE_SHORT_SHORT');
        expect(out.difficultylevel).toBe('OD6S.DIFFICULTY_EASY');
        expect(out.attackerScale).toBe(3);
    });

    it('honors defaultUnknownDifficulty setting', () => {
        const out = HANDLERS['action-rangedattack'](
            makeInput('rangedattack'),
            makeCtx({
                actor: characterWithAttrs(),
                settings: makeSettings({ defaultUnknownDifficulty: true }),
            }),
        );
        expect(out.difficultylevel).toBe('OD6S.DIFFICULTY_UNKNOWN');
    });
});

describe('action-vehiclerangedattack handler', () => {
    it('uses MEC for score and adds the vehicle uuid', () => {
        const out = HANDLERS['action-vehiclerangedattack'](
            makeInput('vehiclerangedattack'),
            makeCtx({
                actor: { type: 'vehicle', uuid: 'Actor.vehicle-1', scale: { score: 9 } },
            }),
        );
        // score for vehicle-action paths comes from MEC on the (character)
        // pilot, not the vehicle. When a vehicle actor itself is the actor,
        // MEC isn't available — orchestrator would resolve via the gunnery
        // skill-score helper; bare handler returns 0.
        expect(out.score).toBe(0);
        expect(out.vehicle).toBe('Actor.vehicle-1');
        expect(out.attackerScale).toBe(9);
    });

    it('reads MEC from a character pilot', () => {
        const pilot = characterWithAttrs({
            vehicle: { uuid: 'Actor.embedded' },
        });
        const out = HANDLERS['action-vehiclerangedattack'](
            makeInput('vehiclerangedattack'),
            makeCtx({
                actor: pilot,
                vehicleStats: { scale: { score: 6 } },
            }),
        );
        expect(out.score).toBe(6); // mec
        expect(out.vehicle).toBe('Actor.embedded');
        expect(out.attackerScale).toBe(6); // from vehicleStats
    });
});

describe('action-meleeattack handler', () => {
    it('uses skill-backed score resolution and sets damagescore to actor strength damage (no +5 — see RFC #100)', () => {
        const skill: ActionSkill = { score: 6, attributeKey: 'str' };
        const out = HANDLERS['action-meleeattack'](
            makeInput('meleeattack', { name: 'OD6S.ACTION_MELEE_ATTACK' }),
            makeCtx({ actor: characterWithAttrs(), actionSkill: skill }),
        );
        expect(out.score).toBe(15); // 6 (skill) + 9 (str)
        expect(out.damagescore).toBe(6); // actor.strengthDamage
        expect(out.attackerScale).toBe(0);
    });

    it('falls back to AGI (rules-fixed for melee combat) when no skill item is present', () => {
        const out = HANDLERS['action-meleeattack'](
            makeInput('meleeattack'),
            makeCtx({ actor: characterWithAttrs(), actionSkill: null }),
        );
        expect(out.score).toBe(12); // agi
    });
});

describe('action-brawlattack handler', () => {
    it('produces physical damage and stun at strength damage with can_stun true', () => {
        const skill: ActionSkill = { score: 3, attributeKey: 'str' };
        const out = HANDLERS['action-brawlattack'](
            makeInput('brawlattack'),
            makeCtx({ actor: characterWithAttrs(), actionSkill: skill }),
        );
        expect(out.score).toBe(12); // 3 + 9
        expect(out.damagetype).toBe('p');
        expect(out.damagescore).toBe(6); // strengthDamage
        expect(out.stundamagetype).toBe('p');
        expect(out.stundamagescore).toBe(6);
        expect(out.can_stun).toBe(true);
    });
});

describe('action-vehicleramattack handler', () => {
    it('produces collision source, physical damage type, vehicle uuid, and a ram damage modifier from vehicle ram_damage score', () => {
        const out = HANDLERS['action-vehicleramattack'](
            makeInput('vehicleramattack'),
            makeCtx({
                actor: {
                    type: 'vehicle', uuid: 'Actor.vehicle-1',
                    scale: { score: 6 }, ram: { score: 3 }, ram_damage: { score: 12 },
                },
            }),
        );
        expect(out.source).toBe('OD6S.COLLISION');
        expect(out.damagetype).toBe('p');
        expect(out.attackerScale).toBe(6);
        expect(out.vehicle).toBe('Actor.vehicle-1');
        expect(out.damagemodifiers).toContainEqual(
            expect.objectContaining({ name: 'OD6S.ACTIVE_EFFECTS', value: 12 }),
        );
    });

    it('reads ram from vehicleStats when the actor is a character pilot', () => {
        const pilot = characterWithAttrs({ vehicle: { uuid: 'Actor.embedded' } });
        const out = HANDLERS['action-vehicleramattack'](
            makeInput('vehicleramattack'),
            makeCtx({
                actor: pilot,
                vehicleStats: { scale: { score: 9 }, ram: { score: 0 }, ram_damage: { score: 6 } },
            }),
        );
        expect(out.vehicle).toBe('Actor.embedded');
        expect(out.attackerScale).toBe(9);
        expect(out.damagemodifiers).toContainEqual(
            expect.objectContaining({ name: 'OD6S.ACTIVE_EFFECTS', value: 6 }),
        );
    });
});

describe('action-vehiclerangedweaponattack handler', () => {
    it('reads damage from the vehicle weapon item, applies weapon mods, and emits the vehicle uuid', () => {
        const vehicleWeapon: ItemView = {
            type: 'vehicle-weapon',
            name: 'Heavy Cannon',
            damage: { type: 'e', score: 18 },
            scale: { score: 6 },
            mods: { dmg: { score: 3 }, misc: { score: 0 }, bonus: { score: 0 } },
        };
        const out = HANDLERS['action-vehiclerangedweaponattack'](
            makeInput('vehiclerangedweaponattack', { itemId: 'Item.weapon-1' }),
            makeCtx({
                actor: { type: 'vehicle', uuid: 'Actor.vehicle-1', scale: { score: 3 } },
                item: vehicleWeapon,
            }),
        );
        expect(out.damagetype).toBe('e');
        expect(out.damagescore).toBe(21); // 18 + 3 (mod)
        expect(out.source).toBe('Heavy Cannon');
        expect(out.attackerScale).toBe(6); // from weapon scale (overrides actor)
        expect(out.vehicle).toBe('Actor.vehicle-1');
    });

    it('falls back to actor scale when the vehicle weapon has no scale of its own', () => {
        const vehicleWeapon: ItemView = {
            type: 'vehicle-weapon',
            name: 'Light Cannon',
            damage: { type: 'e', score: 9 },
            mods: { dmg: { score: 0 }, misc: { score: 0 }, bonus: { score: 0 } },
        };
        const out = HANDLERS['action-vehiclerangedweaponattack'](
            makeInput('vehiclerangedweaponattack', { itemId: 'Item.weapon-2' }),
            makeCtx({
                actor: { type: 'vehicle', uuid: 'Actor.v', scale: { score: 3 } },
                item: vehicleWeapon,
            }),
        );
        expect(out.attackerScale).toBe(3);
    });
});
