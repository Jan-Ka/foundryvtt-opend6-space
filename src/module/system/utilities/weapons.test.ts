import { describe, it, expect } from 'vitest';
import { getMeleeDamage } from './weapons';

describe('getMeleeDamage', () => {
    it('adds strength damage when weapon has str flag', () => {
        const actor = { system: { strengthdamage: { score: 6 } } } as unknown as Actor;
        const weapon = { system: { damage: { str: true, score: 12 } } } as unknown as Item;
        expect(getMeleeDamage(actor, weapon)).toBe(18);
    });

    it('returns weapon damage only when no str flag', () => {
        const actor = { system: { strengthdamage: { score: 6 } } } as unknown as Actor;
        const weapon = { system: { damage: { str: false, score: 12 } } } as unknown as Item;
        expect(getMeleeDamage(actor, weapon)).toBe(12);
    });

    it('handles zero strength damage', () => {
        const actor = { system: { strengthdamage: { score: 0 } } } as unknown as Actor;
        const weapon = { system: { damage: { str: true, score: 9 } } } as unknown as Item;
        expect(getMeleeDamage(actor, weapon)).toBe(9);
    });

    it('handles zero weapon damage with str bonus', () => {
        const actor = { system: { strengthdamage: { score: 6 } } } as unknown as Actor;
        const weapon = { system: { damage: { str: true, score: 0 } } } as unknown as Item;
        expect(getMeleeDamage(actor, weapon)).toBe(6);
    });

    it('coerces string scores via unary plus', () => {
        const actor = { system: { strengthdamage: { score: '6' } } } as unknown as Actor;
        const weapon = { system: { damage: { str: true, score: '12' } } } as unknown as Item;
        expect(getMeleeDamage(actor, weapon)).toBe(18);
    });
});
