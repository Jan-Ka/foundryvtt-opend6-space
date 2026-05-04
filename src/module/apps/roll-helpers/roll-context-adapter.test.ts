/**
 * Unit tests for the Foundry → handler-view boundary projector.
 *
 * Verifies adapter output for each actor / item type covered by the
 * handler families, plus settings/targets pass-through. Uses plain
 * objects shaped like Foundry documents — no Foundry globals.
 */

import { describe, expect, it } from 'vitest';
import {
    adaptActor,
    adaptContext,
    adaptItem,
    adaptSettings,
    adaptTargets,
} from './roll-context-adapter';
import type { RollSettingsRaw } from './roll-context-adapter';

const SETTINGS: RollSettingsRaw = {
    defaultUnknownDifficulty: false,
    diceForScale: false,
    fundsFate: false,
    hideCombatCards: false,
    hideSkillCards: false,
    showSkillSpecialization: true,
    pipsPerDice: 3,
    meleeDifficulty: false,
    explosiveZones: false,
    weaponDamageTable: { 1: { penalty: 3, label: 'OD6S.LIGHT' } },
    flatSkills: false,
    brawlAttribute: 'str',
};

describe('adaptActor', () => {
    it('projects a character with attributes, scale, strengthDamage, and embedded vehicle', () => {
        const actor = {
            type: 'character',
            uuid: 'Actor.x',
            system: {
                attributes: { str: { score: 9 }, agi: { score: '12' } },
                scale: { score: 0 },
                strengthdamage: { score: 6 },
                vehicle: { uuid: 'Actor.veh' },
            },
        };
        const view = adaptActor(actor);
        expect(view).toEqual({
            type: 'character',
            uuid: 'Actor.x',
            attributes: { str: { score: 9 }, agi: { score: 12 } },
            scale: { score: 0 },
            strengthDamage: 6,
            vehicle: { uuid: 'Actor.veh' },
        });
    });

    it('projects a vehicle actor with scale + ram + ram_damage', () => {
        const view = adaptActor({
            type: 'vehicle',
            uuid: 'Actor.v',
            system: { scale: { score: 6 }, ram: { score: 3 }, ram_damage: { score: 12 } },
        });
        expect(view).toEqual({
            type: 'vehicle',
            uuid: 'Actor.v',
            scale: { score: 6 },
            ram: { score: 3 },
            ram_damage: { score: 12 },
        });
    });

    it('projects an NPC like a character (same attribute/scale/vehicle surface)', () => {
        const view = adaptActor({
            type: 'npc',
            uuid: 'Actor.n',
            system: { attributes: { str: { score: 6 } } },
        });
        expect(view.type).toBe('npc');
        if (view.type !== 'npc') throw new Error('narrowing failed');
        expect(view.attributes?.str.score).toBe(6);
    });

    it('falls back to character shape for unknown actor types (handlers fail loud downstream)', () => {
        const view = adaptActor({ type: 'unknown', uuid: 'Actor.u', system: {} });
        expect(view.type).toBe('character');
    });

    it('omits optional fields when their source data is missing', () => {
        const view = adaptActor({ type: 'character', uuid: 'Actor.x', system: {} });
        expect(view).toEqual({ type: 'character', uuid: 'Actor.x' });
    });
});

describe('adaptItem', () => {
    it('projects a skill item with the parent attribute key', () => {
        const view = adaptItem({
            type: 'skill', name: 'Brawling',
            system: { attribute: 'STR' },
        });
        expect(view).toEqual({ type: 'skill', name: 'Brawling', attribute: 'STR' });
    });

    it('projects a specialization item with attribute + parent skill', () => {
        const view = adaptItem({
            type: 'specialization', name: 'Vibroblades',
            system: { attribute: 'STR', skill: 'Melee Combat' },
        });
        expect(view.type).toBe('specialization');
        expect(view.attribute).toBe('STR');
        expect(view.skill).toBe('Melee Combat');
    });

    it('projects a weapon with damage, stun, range, scale, mods, stats, and difficulty', () => {
        const view = adaptItem({
            type: 'weapon', name: 'Test Blaster',
            system: {
                damage: { type: 'e', score: 12, str: false, muscle: false },
                stun: { type: 's', score: 9, stun_only: false },
                range: { short: 10, medium: 30, long: 60 },
                scale: { score: 0 },
                damaged: 1,
                mods: { dmg: { score: 3 }, misc: { score: 0 }, bonus: { score: 0 } },
                stats: { skill: 'Blaster', specialization: 'Test Blaster' },
                difficulty: 'OD6S.DIFFICULTY_MODERATE',
            },
        });
        expect(view.damage).toEqual({ type: 'e', score: 12, str: false, muscle: false });
        expect(view.stun).toEqual({ type: 's', score: 9, stun_only: false });
        expect(view.range).toEqual({ short: 10, medium: 30, long: 60 });
        expect(view.scale).toEqual({ score: 0 });
        expect(view.damaged).toBe(1);
        expect(view.mods).toEqual({ dmg: { score: 3 }, misc: { score: 0 }, bonus: { score: 0 } });
        expect(view.stats).toEqual({ skill: 'Blaster', specialization: 'Test Blaster' });
        expect(view.difficulty).toBe('OD6S.DIFFICULTY_MODERATE');
    });

    it('passes through unknown item types with just type + name', () => {
        const view = adaptItem({ type: 'gizmo', name: 'X', system: {} });
        expect(view).toEqual({ type: 'gizmo', name: 'X' });
    });
});

describe('adaptTargets', () => {
    it('extracts only scale from token actors', () => {
        const tokens = [
            { actor: { system: { scale: { score: 3 } } } },
            { actor: { system: { scale: { score: 6 } } } },
        ];
        expect(adaptTargets(tokens)).toEqual([{ scale: 3 }, { scale: 6 }]);
    });

    it('defaults missing scale to 0', () => {
        expect(adaptTargets([{}, { actor: {} }])).toEqual([{ scale: 0 }, { scale: 0 }]);
    });
});

describe('adaptSettings + adaptContext', () => {
    it('adaptSettings is an immutable copy', () => {
        const view = adaptSettings(SETTINGS);
        expect(view).toEqual(SETTINGS);
        expect(view).not.toBe(SETTINGS);
    });

    it('adaptContext composes the parts', () => {
        const ctx = adaptContext(
            { type: 'character', uuid: 'Actor.x', system: { attributes: { str: { score: 9 } } } },
            { type: 'weapon', name: 'X', system: { damage: { type: 'e', score: 9 } } },
            {
                settings: SETTINGS,
                localize: (k) => k,
                canvasTargets: [{ actor: { system: { scale: { score: 3 } } } }],
            },
        );
        expect(ctx.actor.type).toBe('character');
        expect(ctx.item?.type).toBe('weapon');
        expect(ctx.targets.length).toBe(1);
        expect(ctx.settings.brawlAttribute).toBe('str');
        expect(ctx.localize('OD6S.X')).toBe('OD6S.X');
    });

    it('adaptContext omits item when not provided', () => {
        const ctx = adaptContext(
            { type: 'character', uuid: 'Actor.x', system: {} },
            undefined,
            { settings: SETTINGS, localize: (k) => k, canvasTargets: [] },
        );
        expect(ctx.item).toBeUndefined();
    });
});
