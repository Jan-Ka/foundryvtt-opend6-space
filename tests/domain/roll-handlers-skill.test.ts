/**
 * Domain tests — skill family roll handlers (#98 phase 1).
 *
 * Covers the three skill-family RollTypeKeys against the skill mechanics in
 * the rules reference: skill, skill-dodge, specialization.
 *
 * The handlers under test are stubbed (throw notImplemented); these tests
 * are red on purpose until phase 2 implements them. Each test asserts the
 * rules-defined input → output projection for one handler — bucket fields
 * only (per ROLL_TYPE_FIELDS). Cross-cutting concerns (bonusmod from active
 * effects, flatSkills attribute-as-dice substitution, fp-effect doubling)
 * belong to finalize and are not under test here.
 *
 * Rules referenced (ids only, content lives in gitignored docs/reference/):
 *   skill, skill-dodge       — skill-base-mechanics, skill-check
 *   skill-dodge              — + attacking-and-defending, active-defense
 *   specialization           — specialization-in-skills, skill-check
 */

import { describe, expect, it } from 'vitest';
import { HANDLERS } from '../../src/module/apps/roll-helpers/roll-handlers';
import type {
    HandlerContext,
    ItemView,
    RollSettingsView,
} from '../../src/module/apps/roll-helpers/roll-handlers';
import type { ClassifiedRoll } from '../../src/module/apps/roll-helpers/roll-data';

function makeSettings(overrides: Partial<RollSettingsView> = {}): RollSettingsView {
    return {
        defaultUnknownDifficulty: false,
        diceForScale: false,
        fundsFate: false,
        hideCombatCards: false,
        hideSkillCards: false,
        showSkillSpecialization: true,
        ...overrides,
    };
}

function makeCtx(item: ItemView | undefined, settings?: Partial<RollSettingsView>): HandlerContext {
    return {
        actor: { type: 'character' },
        item,
        targets: [],
        settings: makeSettings(settings),
        localize: (key: string) => key,
    };
}

function classified(key: 'skill' | 'skill-dodge' | 'specialization'): ClassifiedRoll {
    const type = key === 'specialization' ? 'specialization' : 'skill';
    const subtype = key === 'skill-dodge' ? 'dodge' : '';
    return { type, subtype, key };
}

describe('skill handler', () => {
    it('returns the lowercase parent attribute from the skill item', () => {
        const item: ItemView = { type: 'skill', attribute: 'AGI' };
        const out = HANDLERS['skill'](classified('skill'), makeCtx(item));
        expect(out.attribute).toBe('agi');
    });

    it('returns null when the skill item is missing', () => {
        const out = HANDLERS['skill'](classified('skill'), makeCtx(undefined));
        expect(out.attribute).toBeNull();
    });

    it('returns null when the skill item has no attribute', () => {
        const item: ItemView = { type: 'skill' };
        const out = HANDLERS['skill'](classified('skill'), makeCtx(item));
        expect(out.attribute).toBeNull();
    });
});

describe('skill-dodge handler', () => {
    it('produces the same shape as skill — only the classification differs', () => {
        const item: ItemView = { type: 'skill', attribute: 'AGI' };
        const out = HANDLERS['skill-dodge'](classified('skill-dodge'), makeCtx(item));
        expect(out.attribute).toBe('agi');
    });
});

describe('specialization handler', () => {
    it('returns attribute and specSkill from the specialization item when the setting is on', () => {
        const item: ItemView = { type: 'specialization', attribute: 'STR', skill: 'Brawling' };
        const out = HANDLERS['specialization'](classified('specialization'), makeCtx(item));
        expect(out.attribute).toBe('str');
        expect(out.specSkill).toBe('Brawling');
    });

    it('omits specSkill (empty string) when the showSkillSpecialization setting is off', () => {
        const item: ItemView = { type: 'specialization', attribute: 'STR', skill: 'Brawling' };
        const out = HANDLERS['specialization'](
            classified('specialization'),
            makeCtx(item, { showSkillSpecialization: false }),
        );
        expect(out.attribute).toBe('str');
        expect(out.specSkill).toBe('');
    });

    it('returns empty specSkill when the spec item has no parent skill', () => {
        const item: ItemView = { type: 'specialization', attribute: 'STR' };
        const out = HANDLERS['specialization'](classified('specialization'), makeCtx(item));
        expect(out.attribute).toBe('str');
        expect(out.specSkill).toBe('');
    });
});
