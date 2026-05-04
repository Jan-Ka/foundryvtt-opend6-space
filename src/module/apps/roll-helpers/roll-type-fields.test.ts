import { describe, it, expect } from 'vitest';
import { COMMON_FIELDS, ROLL_TYPE_FIELDS } from './roll-type-fields';
import type { RollData } from './roll-data';

describe('ROLL_TYPE_FIELDS / COMMON_FIELDS', () => {
    // Partition totality and overlap are compile-time checked in roll-type-fields.ts;
    // this file only catches what TypeScript can't: within-list duplicates.

    it('COMMON_FIELDS has no duplicates', () => {
        expect(COMMON_FIELDS.length).toBe(new Set(COMMON_FIELDS).size);
    });

    it('each handler bucket has no duplicates', () => {
        for (const [key, fields] of Object.entries(ROLL_TYPE_FIELDS)) {
            expect(fields.length, `bucket ${key}`).toBe(new Set(fields).size);
        }
    });
});

describe('ROLL_TYPE_FIELDS cross-cutting fields', () => {
    // Spot-checks the well-known cross-cutting overlap zones #98 calls out as
    // the surgery risk. If these fields stop being multi-handler, the map has
    // drifted from the actual mutation graph.
    it('damage/attack fields are owned by 2+ handlers', () => {
        const counts = new Map<keyof RollData, number>();
        for (const fields of Object.values(ROLL_TYPE_FIELDS)) {
            for (const f of fields) counts.set(f, (counts.get(f) ?? 0) + 1);
        }
        const crossCutting = [...counts.entries()]
            .filter(([, n]) => n >= 2)
            .map(([f]) => f);
        expect(crossCutting).toContain('damagetype');
        expect(crossCutting).toContain('damagescore');
        expect(crossCutting).toContain('attackerScale');
        expect(crossCutting).toContain('range');
    });
});
