import { describe, it, expect } from 'vitest';
import { classifyRoll, computeScaleMod, coerceScale, isScoreTooLow, type Localize } from './roll-data';

describe('computeScaleMod', () => {
    it('returns 0 when scales match', () => {
        expect(computeScaleMod(3, 3)).toBe(0);
        expect(computeScaleMod(0, 0)).toBe(0);
    });

    it('returns positive when attacker scale is larger', () => {
        expect(computeScaleMod(5, 2)).toBe(3);
    });

    it('returns negative when defender scale is larger', () => {
        expect(computeScaleMod(2, 5)).toBe(-3);
    });
});

describe('coerceScale', () => {
    it('passes through positive numbers', () => {
        expect(coerceScale(3)).toBe(3);
    });

    it('passes through 0', () => {
        expect(coerceScale(0)).toBe(0);
    });

    it('passes through negative numbers', () => {
        expect(coerceScale(-2)).toBe(-2);
    });

    it('returns 0 for undefined', () => {
        expect(coerceScale(undefined)).toBe(0);
    });

    it('returns 0 for null', () => {
        expect(coerceScale(null)).toBe(0);
    });

    it('returns 0 for NaN', () => {
        expect(coerceScale(NaN)).toBe(0);
    });
});

describe('isScoreTooLow', () => {
    const pipsPerDice = 3;

    it('returns true when score is below pipsPerDice', () => {
        expect(isScoreTooLow(0, pipsPerDice, false)).toBe(true);
        expect(isScoreTooLow(2, pipsPerDice, false)).toBe(true);
    });

    it('returns false when score equals pipsPerDice', () => {
        expect(isScoreTooLow(3, pipsPerDice, false)).toBe(false);
    });

    it('returns false when score exceeds pipsPerDice', () => {
        expect(isScoreTooLow(15, pipsPerDice, false)).toBe(false);
    });

    it('flatSkills bypass returns false even for low scores', () => {
        // For flatSkills mode, skill/spec rolls allow score=0 (the dice come from the attribute)
        expect(isScoreTooLow(0, pipsPerDice, true)).toBe(false);
        expect(isScoreTooLow(2, pipsPerDice, true)).toBe(false);
    });
});

describe('classifyRoll', () => {
    // Fake i18n table that mirrors en.json shape for the keys the classifier touches.
    const I18N: Record<string, string> = {
        'OD6S.RANGED': 'Ranged',
        'OD6S.THROWN': 'Thrown',
        'OD6S.MISSILE': 'Missile',
        'OD6S.EXPLOSIVE': 'Explosive',
        'OD6S.MELEE': 'Melee',
        'OD6S.ENERGY_RESISTANCE': 'Energy Resistance',
        'OD6S.PHYSICAL_RESISTANCE': 'Physical Resistance',
        'OD6S.RESISTANCE_NO_ARMOR': 'Resistance (No Armor)',
    };
    const localize: Localize = (k) => I18N[k] ?? k;

    describe('top-level types pass through unchanged', () => {
        it.each([
            ['weapon', 'weapon'],
            ['starship-weapon', 'starship-weapon'],
            ['vehicle-weapon', 'vehicle-weapon'],
            ['damage', 'damage'],
            ['resistance', 'resistance'],
            ['skill', 'skill'],
            ['specialization', 'specialization'],
            ['mortally_wounded', 'mortally_wounded'],
            ['incapacitated', 'incapacitated'],
            ['funds', 'funds'],
            // Top-level attribute roll (Actor.rollAttribute) — distinct from
            // action+attribute, which is dispatched via the action handler.
            ['attribute', 'attribute'],
        ] as const)('type=%s → key=%s', (type, key) => {
            const result = classifyRoll({ type }, localize);
            expect(result).toEqual({ type, subtype: '', key });
        });
    });

    describe('localized subtype aliases collapse to canonical attack subtypes', () => {
        it.each([
            ['Ranged'],
            ['Thrown'],
            ['Missile'],
            ['Explosive'],
        ])('weapon + localized "%s" subtype → rangedattack', (localizedSubtype) => {
            const result = classifyRoll({ type: 'weapon', subtype: localizedSubtype }, localize);
            expect(result.subtype).toBe('rangedattack');
            expect(result.key).toBe('weapon');
        });

        it('weapon + localized "Melee" subtype → meleeattack', () => {
            const result = classifyRoll({ type: 'weapon', subtype: 'Melee' }, localize);
            expect(result.subtype).toBe('meleeattack');
            expect(result.key).toBe('weapon');
        });

        it('localized aliases normalize regardless of host type', () => {
            // Mirrors roll-setup.ts:135 — the alias check is unconditional on type.
            expect(classifyRoll({ type: 'starship-weapon', subtype: 'Ranged' }, localize).subtype)
                .toBe('rangedattack');
            expect(classifyRoll({ type: 'vehicle-weapon', subtype: 'Melee' }, localize).subtype)
                .toBe('meleeattack');
        });

        it('non-aliased subtypes are preserved verbatim', () => {
            expect(classifyRoll({ type: 'weapon', subtype: 'parry' }, localize).subtype).toBe('parry');
        });
    });

    describe('top-level type rewrites', () => {
        it('vehicletoughness → resistance + vehicletoughness subtype', () => {
            expect(classifyRoll({ type: 'vehicletoughness' }, localize)).toEqual({
                type: 'resistance',
                subtype: 'vehicletoughness',
                key: 'resistance-vehicletoughness',
            });
        });

        it('purchase → funds + purchase subtype', () => {
            expect(classifyRoll({ type: 'purchase' }, localize)).toEqual({
                type: 'funds',
                subtype: 'purchase',
                key: 'purchase',
            });
        });

        it('funds with subtype=purchase already keeps the purchase key', () => {
            expect(classifyRoll({ type: 'funds', subtype: 'purchase' }, localize).key).toBe('purchase');
        });
    });

    describe('skill + Dodge name', () => {
        it('rewrites subtype to "dodge"', () => {
            const result = classifyRoll({ type: 'skill', name: 'Dodge' }, localize);
            expect(result).toEqual({ type: 'skill', subtype: 'dodge', key: 'skill-dodge' });
        });

        it('does not trigger for non-Dodge names', () => {
            expect(classifyRoll({ type: 'skill', name: 'Bluff' }, localize).key).toBe('skill');
        });

        it('does not trigger for non-skill types', () => {
            expect(classifyRoll({ type: 'specialization', name: 'Dodge' }, localize).key)
                .toBe('specialization');
        });
    });

    describe('action subtypes', () => {
        it.each([
            ['meleeattack', 'action-meleeattack'],
            ['brawlattack', 'action-brawlattack'],
            ['rangedattack', 'action-rangedattack'],
            ['vehiclerangedattack', 'action-vehiclerangedattack'],
            ['vehiclerangedweaponattack', 'action-vehiclerangedweaponattack'],
            ['vehicleramattack', 'action-vehicleramattack'],
            ['attribute', 'action-attribute'],
        ] as const)('action+%s → %s', (subtype, key) => {
            const result = classifyRoll({ type: 'action', subtype }, localize);
            expect(result).toEqual({ type: 'action', subtype, key });
        });

        it('action + vehicletoughness → resistance (subtype preserved)', () => {
            expect(classifyRoll({ type: 'action', subtype: 'vehicletoughness' }, localize)).toEqual({
                type: 'resistance',
                subtype: 'vehicletoughness',
                key: 'resistance-vehicletoughness',
            });
        });

        it.each([
            'Energy Resistance',
            'Physical Resistance',
            'Resistance (No Armor)',
        ])('action + empty subtype + resistance name "%s" → resistance', (name) => {
            const result = classifyRoll({ type: 'action', subtype: '', name }, localize);
            expect(result).toEqual({ type: 'resistance', subtype: '', key: 'resistance' });
        });

        it('action + empty subtype + non-resistance name stays as action-other', () => {
            const result = classifyRoll({ type: 'action', subtype: '', name: 'Something Else' }, localize);
            expect(result).toEqual({ type: 'action', subtype: '', key: 'action-other' });
        });

        it('action with no subtype defaults to action-other', () => {
            expect(classifyRoll({ type: 'action' }, localize).key).toBe('action-other');
        });
    });

    describe('alias + rewrite interactions', () => {
        it('action + localized "Ranged" → action-rangedattack (alias normalization runs first)', () => {
            const result = classifyRoll({ type: 'action', subtype: 'Ranged' }, localize);
            expect(result).toEqual({
                type: 'action',
                subtype: 'rangedattack',
                key: 'action-rangedattack',
            });
        });

        it('action + localized "Melee" → action-meleeattack', () => {
            const result = classifyRoll({ type: 'action', subtype: 'Melee' }, localize);
            expect(result.key).toBe('action-meleeattack');
        });
    });

    it('throws on unknown type so unregistered paths are caught at the boundary', () => {
        expect(() => classifyRoll({ type: 'totally-unknown' }, localize)).toThrow(/unrecognized roll type/);
    });
});
