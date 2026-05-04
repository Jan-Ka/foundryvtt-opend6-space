/**
 * Unit tests for runFinalize — the COMMON-side assembler.
 *
 * Finalize is a pure object-builder; tests verify each output field maps
 * from the precomputed COMMON inputs / handler bucket as documented. No
 * Foundry mocks needed — opaque ref fields just pass through.
 */

import { describe, expect, it } from 'vitest';
import { runFinalize } from './roll-finalize';
import type { FinalizeInput } from './roll-finalize';
import type { ClassifiedRoll, RollTypeKey } from './roll-data';
import type { Penalties } from './action-math';

const noPenalties: Penalties = {
    woundPenalty: 0, actionPenalty: 0, stunnedPenalty: 0, isBypass: false,
};

function classified(type: string, subtype: string, key: RollTypeKey): ClassifiedRoll {
    return { type: type as ClassifiedRoll['type'], subtype, key };
}

function baseInput<K extends RollTypeKey>(
    overrides: Partial<FinalizeInput<K>> & { classified: ClassifiedRoll; bucket: FinalizeInput<K>['bucket'] },
): FinalizeInput<K> {
    return {
        score: 0,
        name: '',
        itemId: '',
        difficulty: 0,
        difficultyLevel: 'OD6S.DIFFICULTY_EASY',
        isExplosive: false,
        isVisible: false,
        fatepointEffect: false,
        canUseFp: true,
        canUseCp: true,
        wildDie: false,
        showWildDie: false,
        penalties: noPenalties,
        otherPenalty: 0,
        bonusmod: 0,
        miscMod: 0,
        scaleMod: 0,
        range: 'OD6S.RANGE_POINT_BLANK_SHORT',
        vehicleTerrainDifficulty: 'OD6S.DIFFICULTY_EASY',
        pipsPerDice: 3,
        actorRef: { id: 'actor-x' },
        tokenRef: undefined,
        targetsRef: [],
        targetRef: undefined,
        ...overrides,
    } as FinalizeInput<K>;
}

describe('runFinalize — score → dice/pips conversion', () => {
    it('converts score 14 to 4D+2 at pipsPerDice=3', () => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
            score: 14,
        }));
        expect(out.dice).toBe(4);
        expect(out.pips).toBe(2);
        expect(out.originaldice).toBe(4);
        expect(out.originalpips).toBe(2);
    });

    it('converts bonusmod to bonusdice/bonuspips the same way', () => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
            bonusmod: 7,
        }));
        expect(out.bonusdice).toBe(2);
        expect(out.bonuspips).toBe(1);
    });
});

describe('runFinalize — bucket fields override defaults', () => {
    it('weapon bucket sets damage/source/range fields', () => {
        const out = runFinalize(baseInput<'weapon'>({
            classified: classified('weapon', '', 'weapon'),
            score: 12,
            bucket: {
                damagetype: 'e',
                damagescore: 18,
                stundamagetype: '',
                stundamagescore: 0,
                damagemodifiers: [],
                source: 'Test Blaster',
                range: 'OD6S.RANGE_SHORT_SHORT',
                difficultylevel: 'OD6S.DIFFICULTY_EASY',
                only_stun: false,
                can_stun: false,
                stun: false,
                attackerScale: 0,
                specSkill: '',
            },
        }));
        expect(out.damagetype).toBe('e');
        expect(out.damagescore).toBe(18);
        expect(out.source).toBe('Test Blaster');
        expect(out.range).toBe('OD6S.RANGE_SHORT_SHORT');
    });

    it('skill bucket sets attribute (no other bucket fields touched)', () => {
        const out = runFinalize(baseInput<'skill'>({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
        }));
        expect(out.attribute).toBe('agi');
        // Damage defaults stay at zero
        expect(out.damagescore).toBe(0);
    });
});

describe('runFinalize — isOppasable derivation', () => {
    it.each([
        ['skill', '', true],
        ['attribute', '', true],
        ['specialization', '', true],
        ['damage', '', true],
        ['resistance', '', true],
        ['weapon', '', false],
        ['action', 'meleeattack', false],
        ['action', 'specialization', true], // action+opposable subtype
        ['action', 'damage', true],
        ['mortally_wounded', '', false],
    ])('type=%s subtype=%s → isOppasable=%s', (type, subtype, expected) => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified(type, subtype, 'skill'), // key irrelevant here
            bucket: { attribute: null },
        }));
        expect(out.isoppasable).toBe(expected);
    });
});

describe('runFinalize — penalties pass-through', () => {
    it('forwards the penalty record to woundpenalty/actionpenalty/stunnedpenalty', () => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
            penalties: { woundPenalty: 3, actionPenalty: 1, stunnedPenalty: 2, isBypass: false },
            otherPenalty: 4,
        }));
        expect(out.woundpenalty).toBe(3);
        expect(out.actionpenalty).toBe(1);
        expect(out.stunnedpenalty).toBe(2);
        expect(out.otherpenalty).toBe(4);
    });
});

describe('runFinalize — modifiers sub-object', () => {
    it('builds the modifiers block with miscmod / scalemod / range', () => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
            miscMod: 3,
            scaleMod: -2,
            range: 'OD6S.RANGE_LONG',
        }));
        expect(out.modifiers).toEqual({
            range: 'OD6S.RANGE_LONG',
            attackoption: 'OD6S.ATTACK_STANDARD',
            calledshot: '',
            cover: '',
            coverlight: '',
            coversmoke: '',
            miscmod: 3,
            scalemod: -2,
        });
    });
});

describe('runFinalize — opaque pass-through', () => {
    it('passes actor/token/targets refs through unchanged', () => {
        const actor = { id: 'actor-x' };
        const token = { id: 'token-x' };
        const targets = [{ id: 'token-a' }, { id: 'token-b' }];
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
            actorRef: actor,
            tokenRef: token,
            targetsRef: targets,
            targetRef: targets[0],
        }));
        expect(out.actor).toBe(actor);
        expect(out.token).toBe(token);
        expect(out.targets).toBe(targets);
        expect(out.target).toBe(targets[0]);
    });
});

describe('runFinalize — stable defaults', () => {
    it('emits the documented default values for handler-irrelevant fields', () => {
        const out = runFinalize(baseInput<"skill">({
            classified: classified('skill', '', 'skill'),
            bucket: { attribute: 'agi' },
        }));
        expect(out.multishot).toBe(false);
        expect(out.shots).toBe(1);
        expect(out.fulldefense).toBe(false);
        expect(out.timer).toBe(0);
        expect(out.template).toBe('systems/od6s/templates/roll.html');
        expect(out.vehiclespeed).toBe('cruise');
        expect(out.vehiclecollisiontype).toBe('t_bone');
        expect(out.fatepoint).toBe(false);
        expect(out.contact).toBe(false);
        expect(out.cpcost).toBe(0);
        expect(out.cpcostcolor).toBe('black');
        expect(out.characterpoints).toBe(0);
        expect(out.isknown).toBe(false);
    });
});
