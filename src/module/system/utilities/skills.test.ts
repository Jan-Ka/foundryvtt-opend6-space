import { describe, it, expect } from 'vitest';
import { getScoreFromSkill } from './skills';

// Mock actor with items collection that has a find method
function mockActor(items: any[], attributes: Record<string, { score: number }>): Actor {
    return {
        items: {
            find: (predicate: any) => items.find(predicate),
        },
        system: { attributes },
    } as unknown as Actor;
}

describe('getScoreFromSkill', () => {
    const attributes = {
        agi: { score: 9 },
        str: { score: 12 },
        mec: { score: 6 },
    };

    it('returns attribute score when no spec or skill provided', () => {
        const actor = mockActor([], attributes);
        expect(getScoreFromSkill(actor, '', '', 'agi')).toBe(9);
    });

    it('adds skill score to attribute', () => {
        const actor = mockActor([
            { name: 'Dodge', type: 'skill', system: { score: 3 } },
        ], attributes);
        expect(getScoreFromSkill(actor, '', 'Dodge', 'agi')).toBe(12); // 9 + 3
    });

    it('prefers specialization over skill', () => {
        const actor = mockActor([
            { name: 'Dodge', type: 'skill', system: { score: 3 } },
            { name: 'Vehicle Dodge', type: 'specialization', system: { score: 5 } },
        ], attributes);
        expect(getScoreFromSkill(actor, 'Vehicle Dodge', 'Dodge', 'agi')).toBe(14); // 9 + 5
    });

    it('falls back to skill when spec not found', () => {
        const actor = mockActor([
            { name: 'Dodge', type: 'skill', system: { score: 3 } },
        ], attributes);
        expect(getScoreFromSkill(actor, 'NonExistent Spec', 'Dodge', 'agi')).toBe(12); // 9 + 3
    });

    it('handles case-insensitive attribute lookup', () => {
        const actor = mockActor([], attributes);
        expect(getScoreFromSkill(actor, '', '', 'AGI')).toBe(9);
        expect(getScoreFromSkill(actor, '', '', 'Str')).toBe(12);
    });

    it('returns just attribute when skill not found', () => {
        const actor = mockActor([], attributes);
        expect(getScoreFromSkill(actor, '', 'NonExistent', 'mec')).toBe(6);
    });
});
