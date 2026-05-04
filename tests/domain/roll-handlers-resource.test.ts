/**
 * Domain tests — resource / legacy family roll handlers (#98 phase 1).
 *
 * Covers funds, purchase, and top-level attribute. Buckets are minimal:
 *   funds / attribute  — empty (rules-defined work is on the COMMON path:
 *                        visibility, fp/cp gating, etc.)
 *   purchase           — `seller` only
 *
 * Rules referenced (ids only):
 *   funds       — funds-determination, equipment-purchase-mechanics
 *   purchase    — funds-determination, equipment-purchase-mechanics
 *   attribute   — skill-check, attribute-dice-distribution
 */

import { describe, expect, it } from 'vitest';
import { HANDLERS } from '../../src/module/apps/roll-helpers/roll-handlers';
import type {
    HandlerContext,
    HandlerInput,
    RollSettingsView,
} from '../../src/module/apps/roll-helpers/roll-handlers';
import type { RollTypeKey } from '../../src/module/apps/roll-helpers/roll-data';

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

function makeCtx(settings?: Partial<RollSettingsView>): HandlerContext {
    return {
        actor: { type: 'character', uuid: 'Actor.x' },
        targets: [],
        settings: makeSettings(settings),
        localize: (key: string) => key,
    };
}

function makeInput(key: 'funds' | 'purchase' | 'attribute', extras: Partial<HandlerInput> = {}): HandlerInput {
    const type = key === 'purchase' ? 'funds' : key;
    const subtype = key === 'purchase' ? 'purchase' : '';
    return {
        classified: { type, subtype, key: key as RollTypeKey },
        name: '',
        score: 0,
        type,
        subtype,
        ...extras,
    };
}

describe('funds handler', () => {
    it('returns an empty bucket — fp/cp gating and visibility live on COMMON', () => {
        const out = HANDLERS['funds'](makeInput('funds'), makeCtx());
        expect(out).toEqual({});
    });
});

describe('purchase handler', () => {
    it('returns the seller from input', () => {
        const out = HANDLERS['purchase'](
            makeInput('purchase', { seller: 'Joe the Vendor' }),
            makeCtx(),
        );
        expect(out.seller).toBe('Joe the Vendor');
    });

    it('returns empty seller when not supplied', () => {
        const out = HANDLERS['purchase'](makeInput('purchase'), makeCtx());
        expect(out.seller).toBe('');
    });
});

describe('attribute handler', () => {
    it('returns an empty bucket — score comes pre-set on input from the rollAttribute caller', () => {
        const out = HANDLERS['attribute'](
            makeInput('attribute', { score: 9, attribute: 'str' }),
            makeCtx(),
        );
        expect(out).toEqual({});
    });
});

