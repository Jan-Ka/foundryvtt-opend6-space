/**
 * Unit tests for accumulateRollMods — phase-3 mod folding extracted from
 * roll-setup.ts.
 *
 * The helper wires `applyWeaponMods` (pure) and `getEffectMod` (reads
 * `actor.system.customeffects` for character actors) plus a handful of
 * inline branches keyed off `classified` / `subtype`. No Foundry globals,
 * minimal Actor/Item shims via `as unknown as`.
 */

import { describe, it, expect } from 'vitest';
import { accumulateRollMods } from './roll-mod-accumulator';
import type { ClassifiedRoll, RollTypeKey } from './roll-data';

function classified(type: ClassifiedRoll['type'], subtype: string, key: RollTypeKey): ClassifiedRoll {
    return { type, subtype, key };
}

interface CharacterShape {
    melee?: { mod: number };
    brawl?: { mod: number };
    dodge?: { mod: number };
    parry?: { mod: number };
    block?: { mod: number };
    ranged?: { mod: number; score?: number };
    vehicle?: { ranged?: { score: number }; ram?: { score: number } };
    customeffects?: {
        skills: Record<string, number>;
        specializations: Record<string, number>;
    };
    items?: unknown[];
}

function characterActor(system: CharacterShape, items: unknown[] = []): Actor {
    return {
        type: 'character',
        system,
        items,
    } as unknown as Actor;
}

function vehicleActor(system: Record<string, unknown>): Actor {
    return {
        type: 'vehicle',
        system,
        items: [],
    } as unknown as Actor;
}

function weaponItem(modsOverrides: Partial<{ difficulty: number; attack: number; damage: number }> = {}, stats?: { skill?: string; specialization?: string }): Item {
    return {
        type: 'weapon',
        system: {
            mods: { difficulty: 0, attack: 0, damage: 0, ...modsOverrides },
            stats: stats ?? {},
        },
    } as unknown as Item;
}

function skillItem(name: string): Item {
    return { type: 'skill', name, system: {} } as unknown as Item;
}

function specItem(name: string): Item {
    return { type: 'specialization', name, system: {} } as unknown as Item;
}

describe('accumulateRollMods', () => {
    it('returns zeros when nothing applies', () => {
        const actor = characterActor({});
        const result = accumulateRollMods({
            actor, item: undefined, classified: classified('attribute', '', 'attribute'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result).toEqual({ bonusmod: 0, miscMod: 0 });
    });

    it('folds weapon difficulty/attack mods on weapon-classified rolls', () => {
        const actor = characterActor({});
        const item = weaponItem({ difficulty: 2, attack: 3 });
        const result = accumulateRollMods({
            actor, item, classified: classified('weapon', '', 'weapon'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result).toEqual({ bonusmod: 3, miscMod: 2 });
    });

    it('adds specialization effect mod when actor owns it (precedence over skill)', () => {
        const actor = characterActor({
            customeffects: { skills: { Blasters: 4 }, specializations: { Pistols: 5 } },
        }, [specItem('Pistols'), skillItem('Blasters')]);
        const item = weaponItem({}, { skill: 'Blasters', specialization: 'Pistols' });
        const result = accumulateRollMods({
            actor, item, classified: classified('weapon', '', 'weapon'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(5);
    });

    it('falls back to skill effect mod when actor does not own the specialization', () => {
        const actor = characterActor({
            customeffects: { skills: { Blasters: 4 }, specializations: { Pistols: 5 } },
        }, [skillItem('Blasters')]);
        const item = weaponItem({}, { skill: 'Blasters', specialization: 'Pistols' });
        const result = accumulateRollMods({
            actor, item, classified: classified('weapon', '', 'weapon'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(4);
    });

    it('does not fold weapon mods when classified type is action-routed', () => {
        const actor = characterActor({ melee: { mod: 0 } });
        const item = weaponItem({ difficulty: 9, attack: 9 });
        const result = accumulateRollMods({
            actor, item, classified: classified('action', 'meleeattack', 'action-meleeattack'),
            subtype: 'meleeattack', isRangedSubtype: false,
        });
        expect(result).toEqual({ bonusmod: 0, miscMod: 0 });
    });

    it('folds vehicle-borne weapon mods on action-vehiclerangedweaponattack', () => {
        const actor = characterActor({});
        const item = {
            type: 'vehicle-weapon',
            system: { mods: { difficulty: 1, attack: 2, damage: 0 }, stats: {} },
        } as unknown as Item;
        const result = accumulateRollMods({
            actor, item,
            classified: classified('action', 'vehiclerangedweaponattack', 'action-vehiclerangedweaponattack'),
            subtype: 'vehiclerangedweaponattack', isRangedSubtype: true,
        });
        expect(result.miscMod).toBe(1);
        expect(result.bonusmod).toBeGreaterThanOrEqual(2);
    });

    it('adds skill effect mod for skill-classified rolls', () => {
        const actor = characterActor({
            customeffects: { skills: { Dodge: 6 }, specializations: {} },
        });
        const result = accumulateRollMods({
            actor, item: skillItem('Dodge'),
            classified: classified('skill', '', 'skill'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(6);
    });

    it('adds specialization effect mod for specialization-classified rolls', () => {
        const actor = characterActor({
            customeffects: { skills: {}, specializations: { Pistols: 7 } },
        });
        const result = accumulateRollMods({
            actor, item: specItem('Pistols'),
            classified: classified('specialization', '', 'specialization'),
            subtype: '', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(7);
    });

    it.each([
        ['meleeattack', 'melee'],
        ['brawlattack', 'brawl'],
        ['dodge', 'dodge'],
        ['parry', 'parry'],
        ['block', 'block'],
    ] as const)('adds character.%s.mod for subtype %s', (subtype, field) => {
        const actor = characterActor({ [field]: { mod: 4 } } as CharacterShape);
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', subtype, `action-${subtype}` as RollTypeKey),
            subtype, isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(4);
    });

    it('adds personal ranged.mod on personal ranged-attack subtypes', () => {
        const actor = characterActor({ ranged: { mod: 3 } });
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', 'rangedattack', 'action-rangedattack'),
            subtype: 'rangedattack', isRangedSubtype: true,
        });
        expect(result.bonusmod).toBe(3);
    });

    it('reads character.system.vehicle.ranged.score on vehicle-prefixed ranged subtypes', () => {
        const actor = characterActor({ ranged: { mod: 99 }, vehicle: { ranged: { score: 5 } } });
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', 'vehiclerangedattack', 'action-vehiclerangedattack'),
            subtype: 'vehiclerangedattack', isRangedSubtype: true,
        });
        expect(result.bonusmod).toBe(5);
    });

    it('reads vehicle.system.ranged.score when an embedded pilot fires from a vehicle actor', () => {
        const actor = vehicleActor({
            ranged: { score: 6 },
            embedded_pilot: { value: 'pilot-id' },
        });
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', 'vehiclerangedattack', 'action-vehiclerangedattack'),
            subtype: 'vehiclerangedattack', isRangedSubtype: true,
        });
        expect(result.bonusmod).toBe(6);
    });

    it('adds ram.score exactly once on action-vehicleramattack (RFC #103)', () => {
        const actor = characterActor({ vehicle: { ram: { score: 4 } } });
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', 'vehicleramattack', 'action-vehicleramattack'),
            subtype: 'vehicleramattack', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(4);
    });

    it('reads vehicle actor ram.score on action-vehicleramattack', () => {
        const actor = vehicleActor({ ram: { score: 8 } });
        const result = accumulateRollMods({
            actor, item: undefined,
            classified: classified('action', 'vehicleramattack', 'action-vehicleramattack'),
            subtype: 'vehicleramattack', isRangedSubtype: false,
        });
        expect(result.bonusmod).toBe(8);
    });
});
