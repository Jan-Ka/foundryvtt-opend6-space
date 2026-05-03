import { describe, it, expect } from 'vitest';
import { resolveSkillBackedAction } from './action-math';

const attributes = {
    agi: { score: 9 },
    str: { score: 12 },
    mec: { score: 6 },
};

describe('resolveSkillBackedAction', () => {
    it('skill present + flat-skills: score = attribute, flatPips = skill.score', () => {
        const result = resolveSkillBackedAction({
            skill: { score: 4, attributeKey: 'agi' },
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        });
        expect(result).toEqual({ score: 9, flatPips: 4 });
    });

    it('skill present + non-flat: score = skill.score + attribute, no flatPips', () => {
        const result = resolveSkillBackedAction({
            skill: { score: 4, attributeKey: 'str' },
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'agi',
        });
        expect(result).toEqual({ score: 16 });
        expect(result.flatPips).toBeUndefined();
    });

    it('skill missing: falls back to the requested attribute (melee → agi)', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        })).toEqual({ score: 9 });
    });

    it('skill missing: falls back to brawl attribute (mec)', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'mec',
        })).toEqual({ score: 6 });
    });

    it('returns 0 when the skill points to an unknown attribute key', () => {
        expect(resolveSkillBackedAction({
            skill: { score: 5, attributeKey: 'unknown' },
            attributes,
            flatSkills: true,
            fallbackAttributeKey: 'agi',
        })).toEqual({ score: 0, flatPips: 5 });
    });

    it('returns 0 when the fallback attribute is not present', () => {
        expect(resolveSkillBackedAction({
            skill: null,
            attributes,
            flatSkills: false,
            fallbackAttributeKey: 'wis',
        })).toEqual({ score: 0 });
    });
});
