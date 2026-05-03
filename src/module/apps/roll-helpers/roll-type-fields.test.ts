import { describe, it, expect } from 'vitest';
import { COMMON_FIELDS, ROLL_TYPE_FIELDS } from './roll-type-fields';
import type { RollData, RollTypeKey } from './roll-data';

/**
 * Canonical list of every keyof RollData. Sourced from the interface
 * declaration in roll-data.ts — keep in sync. The well-formedness test
 * fails loudly if RollData grows a field that's not classified.
 */
const ALL_ROLL_DATA_FIELDS: readonly (keyof RollData)[] = [
    'label', 'title', 'dice', 'pips', 'specSkill', 'originaldice', 'originalpips',
    'score', 'wilddie', 'showWildDie', 'canusefp', 'fatepoint', 'fatepointeffect',
    'characterpoints', 'canusecp', 'contact', 'cpcost', 'cpcostcolor',
    'bonusdice', 'bonuspips', 'isvisible', 'isknown', 'isExplosive',
    'type', 'subtype', 'attribute', 'actor', 'token',
    'actionpenalty', 'woundpenalty', 'stunnedpenalty', 'otherpenalty',
    'multishot', 'shots', 'fulldefense', 'itemid', 'targets', 'target',
    'timer', 'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
    'damagemodifiers', 'difficultylevel', 'isoppasable', 'difficulty',
    'scaledice', 'seller', 'vehicle', 'vehiclespeed', 'vehiclecollisiontype',
    'vehicleterraindifficulty', 'source', 'range', 'template',
    'only_stun', 'can_stun', 'stun', 'attackerScale', 'modifiers', 'rollmode',
];

const allBucketFields = (): Set<keyof RollData> => {
    const u = new Set<keyof RollData>();
    for (const fields of Object.values(ROLL_TYPE_FIELDS)) {
        for (const f of fields) u.add(f);
    }
    return u;
};

describe('ROLL_TYPE_FIELDS / COMMON_FIELDS partition', () => {
    it('every keyof RollData appears in COMMON_FIELDS or at least one handler bucket', () => {
        const common = new Set<keyof RollData>(COMMON_FIELDS);
        const handlerOwned = allBucketFields();
        const missing = ALL_ROLL_DATA_FIELDS.filter(f => !common.has(f) && !handlerOwned.has(f));
        expect(missing).toEqual([]);
    });

    it('no field appears in both COMMON_FIELDS and any handler bucket (strict partition)', () => {
        const common = new Set<keyof RollData>(COMMON_FIELDS);
        const overlap: { key: RollTypeKey; field: keyof RollData }[] = [];
        for (const [key, fields] of Object.entries(ROLL_TYPE_FIELDS) as [RollTypeKey, readonly (keyof RollData)[]][]) {
            for (const f of fields) {
                if (common.has(f)) overlap.push({ key, field: f });
            }
        }
        expect(overlap).toEqual([]);
    });

    it('COMMON_FIELDS has no duplicates', () => {
        expect(COMMON_FIELDS.length).toBe(new Set(COMMON_FIELDS).size);
    });

    it('each handler bucket has no duplicates', () => {
        for (const [key, fields] of Object.entries(ROLL_TYPE_FIELDS)) {
            expect(fields.length, `bucket ${key}`).toBe(new Set(fields).size);
        }
    });

    it('ALL_ROLL_DATA_FIELDS matches the declared partition size (catches RollData growth)', () => {
        // If RollData gains a new field, ALL_ROLL_DATA_FIELDS needs updating
        // and the partition test above will report the missing field.
        const partitionSize = COMMON_FIELDS.length + allBucketFields().size;
        expect(ALL_ROLL_DATA_FIELDS.length).toBe(partitionSize);
    });
});

describe('ROLL_TYPE_FIELDS cross-cutting visibility', () => {
    /**
     * Diagnostic, not asserted: documents which fields are written by
     * multiple handlers (the cross-cutting state leaks #98 calls out).
     * If this list shrinks dramatically, something is wrong with the map.
     */
    it('reports fields owned by 2+ handlers', () => {
        const counts = new Map<keyof RollData, number>();
        for (const fields of Object.values(ROLL_TYPE_FIELDS)) {
            for (const f of fields) counts.set(f, (counts.get(f) ?? 0) + 1);
        }
        const crossCutting = [...counts.entries()]
            .filter(([, n]) => n >= 2)
            .map(([f]) => f)
            .sort();
        // Sanity: damage/attack fields are the well-known overlap zones.
        expect(crossCutting).toContain('damagetype');
        expect(crossCutting).toContain('damagescore');
        expect(crossCutting).toContain('attackerScale');
        expect(crossCutting).toContain('range');
    });
});
