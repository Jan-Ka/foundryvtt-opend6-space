/**
 * Domain tests — damage / resistance family roll handlers (#98 phase 1).
 *
 * Covers the five RollTypeKeys whose buckets describe post-attack damage
 * resolution and follow-up survival rolls: damage, resistance,
 * resistance-vehicletoughness, mortally_wounded, incapacitated.
 *
 * Most buckets are empty — the rules-defined work for these handlers is
 * mostly carried by the COMMON path (dice/pips assembly, weapon-damaged
 * penalty fold, opposed-flag derivation). The bucket-owned outputs are:
 *   resistance / resistance-vehicletoughness — `scaledice` (only when
 *     diceForScale is on; converts an input scale value to a die count
 *     using the system pipsPerDice constant)
 *   resistance-vehicletoughness — `vehicle` (UUID of the vehicle being
 *     resisted on behalf of: the actor itself for vehicle/starship actors,
 *     the embedded ref for character actors piloting one)
 *
 * Rules referenced (ids only):
 *   damage                       — step-3-determining-damage,
 *                                  body-points-damage-application
 *   resistance                   — damage-resistance-total-body-points,
 *                                  damage-resistance-total-wound-levels
 *   resistance-vehicletoughness  — scale, damage-resistance-total-body-points,
 *                                  vehicle-damage
 *   mortally_wounded             — unconsciousness-and-death, wound-level-effects
 *   incapacitated                — wound-level-effects (status check)
 */

import { describe, expect, it } from 'vitest';
import { HANDLERS } from '../../src/module/apps/roll-helpers/roll-handlers';
import type {
    ActorView,
    HandlerContext,
    HandlerInput,
    RollSettingsView,
} from '../../src/module/apps/roll-helpers/roll-handlers';
import type { RollTypeKey } from '../../src/module/apps/roll-helpers/roll-data';

type DamageResistanceKey =
    | 'damage'
    | 'resistance'
    | 'resistance-vehicletoughness'
    | 'mortally_wounded'
    | 'incapacitated';

function makeSettings(overrides: Partial<RollSettingsView> = {}): RollSettingsView {
    return {
        defaultUnknownDifficulty: false,
        diceForScale: false,
        fundsFate: false,
        hideCombatCards: false,
        hideSkillCards: false,
        showSkillSpecialization: true,
        pipsPerDice: 3,
        ...overrides,
    };
}

function makeCtx(actor: ActorView, settings?: Partial<RollSettingsView>): HandlerContext {
    return {
        actor,
        targets: [],
        settings: makeSettings(settings),
        localize: (key: string) => key,
    };
}

function makeInput(key: DamageResistanceKey, scale?: number | null): HandlerInput {
    const type =
        key === 'damage' ? 'damage'
            : key === 'mortally_wounded' ? 'mortally_wounded'
                : key === 'incapacitated' ? 'incapacitated'
                    : 'resistance';
    const subtype = key === 'resistance-vehicletoughness' ? 'vehicletoughness' : '';
    return {
        classified: { type, subtype, key: key as RollTypeKey },
        name: '',
        score: 0,
        type,
        subtype,
        scale,
    };
}

describe('damage handler', () => {
    it('returns an empty bucket — damage math is COMMON, not bucket-owned', () => {
        const out = HANDLERS['damage'](
            makeInput('damage'),
            makeCtx({ type: 'character', uuid: 'Actor.x' }),
        );
        expect(out).toEqual({});
    });
});

describe('resistance handler', () => {
    it('returns scaledice=0 when diceForScale is off, regardless of input scale', () => {
        const out = HANDLERS['resistance'](
            makeInput('resistance', 6),
            makeCtx({ type: 'character', uuid: 'Actor.x' }, { diceForScale: false }),
        );
        expect(out.scaledice).toBe(0);
    });

    it('converts input scale to dice when diceForScale is on (score 6 → 2 dice at pipsPerDice=3)', () => {
        const out = HANDLERS['resistance'](
            makeInput('resistance', 6),
            makeCtx({ type: 'character', uuid: 'Actor.x' }, { diceForScale: true }),
        );
        expect(out.scaledice).toBe(2);
    });

    it('treats missing scale (null/undefined) as 0', () => {
        const outA = HANDLERS['resistance'](
            makeInput('resistance', null),
            makeCtx({ type: 'character', uuid: 'Actor.x' }, { diceForScale: true }),
        );
        const outB = HANDLERS['resistance'](
            makeInput('resistance'),
            makeCtx({ type: 'character', uuid: 'Actor.x' }, { diceForScale: true }),
        );
        expect(outA.scaledice).toBe(0);
        expect(outB.scaledice).toBe(0);
    });
});

describe('resistance-vehicletoughness handler', () => {
    it('uses the actor uuid when the actor is a vehicle', () => {
        const out = HANDLERS['resistance-vehicletoughness'](
            makeInput('resistance-vehicletoughness', 9),
            makeCtx({ type: 'vehicle', uuid: 'Actor.vehicle-1' }, { diceForScale: true }),
        );
        expect(out.vehicle).toBe('Actor.vehicle-1');
        expect(out.scaledice).toBe(3);
    });

    it('uses the actor uuid when the actor is a starship', () => {
        const out = HANDLERS['resistance-vehicletoughness'](
            makeInput('resistance-vehicletoughness', 0),
            makeCtx({ type: 'starship', uuid: 'Actor.starship-1' }),
        );
        expect(out.vehicle).toBe('Actor.starship-1');
    });

    it('uses the embedded vehicle uuid when the actor is a character piloting one', () => {
        const out = HANDLERS['resistance-vehicletoughness'](
            makeInput('resistance-vehicletoughness'),
            makeCtx({
                type: 'character',
                uuid: 'Actor.pilot',
                vehicle: { uuid: 'Actor.embedded-vehicle' },
            }),
        );
        expect(out.vehicle).toBe('Actor.embedded-vehicle');
    });

    it('returns empty vehicle when the character has no embedded vehicle ref', () => {
        const out = HANDLERS['resistance-vehicletoughness'](
            makeInput('resistance-vehicletoughness'),
            makeCtx({ type: 'character', uuid: 'Actor.pilot' }),
        );
        expect(out.vehicle).toBe('');
    });
});

describe('mortally_wounded and incapacitated handlers', () => {
    it.each<DamageResistanceKey>(['mortally_wounded', 'incapacitated'])(
        '%s returns an empty bucket — survival/state checks have no bucket-owned output',
        (key) => {
            const out = HANDLERS[key](
                makeInput(key),
                makeCtx({ type: 'character', uuid: 'Actor.x' }),
            );
            expect(out).toEqual({});
        },
    );
});
