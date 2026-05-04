/**
 * Unit tests for the pure pieces of runPreflight.
 *
 * The Foundry-coupled gate wrappers (explosive dialog, sheet-mode warning,
 * canvas distance measurement) aren't directly unit-testable without mocking
 * Foundry; their pure decision logic is extracted into helpers tested here.
 */

import { describe, expect, it } from 'vitest';
import { meleeRangeGateApplies } from './roll-preflight-checks';

// Mirrors what game.i18n.localize would return — for OD6S.MELEE returns
// the human-readable label "Melee" so we can build a roll request that
// looks like one item.roll() would actually produce on a melee weapon.
const fakeLocalize = (key: string): string => {
    if (key === 'OD6S.MELEE') return 'Melee';
    if (key === 'OD6S.RANGED') return 'Ranged';
    return key;
};

describe('meleeRangeGateApplies', () => {
    it('returns true for canonical "meleeattack" subtype', () => {
        expect(
            meleeRangeGateApplies(
                { type: 'action', subtype: 'meleeattack' },
                fakeLocalize,
            ),
        ).toBe(true);
    });

    it('returns true for canonical "brawlattack" subtype', () => {
        expect(
            meleeRangeGateApplies(
                { type: 'action', subtype: 'brawlattack' },
                fakeLocalize,
            ),
        ).toBe(true);
    });

    it('returns true for a localized melee subtype (e.g. "Melee" from item.roll() on a melee weapon)', () => {
        // This is the regression Copilot caught on PR #102: setupRollData's
        // own subtype normalization (OD6S.MELEE → meleeattack) used to run
        // BEFORE the range check. After extracting the gate into preflight,
        // the canonical-only subtype check would skip the gate entirely for
        // weapon item.roll() — letting melee weapon attacks bypass the
        // out-of-range warning. classifyRoll handles the normalization here.
        expect(
            meleeRangeGateApplies(
                { type: 'weapon', subtype: 'Melee' },
                fakeLocalize,
            ),
        ).toBe(true);
    });

    it('returns false for ranged-weapon subtypes (canonical or localized)', () => {
        expect(
            meleeRangeGateApplies(
                { type: 'action', subtype: 'rangedattack' },
                fakeLocalize,
            ),
        ).toBe(false);
        expect(
            meleeRangeGateApplies(
                { type: 'weapon', subtype: 'Ranged' },
                fakeLocalize,
            ),
        ).toBe(false);
    });

    it('returns false for non-attack roll types (skill/specialization/etc.)', () => {
        expect(
            meleeRangeGateApplies(
                { type: 'skill', subtype: '' },
                fakeLocalize,
            ),
        ).toBe(false);
    });
});
