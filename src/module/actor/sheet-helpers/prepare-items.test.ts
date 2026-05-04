import {describe, expect, it} from 'vitest';

import {
    defaultImgForItemType,
    prepareCharacterItems,
    prepareVehicleItems,
    prepareStarshipItems,
    prepareContainerItems,
} from './prepare-items';

const CARGO_TYPES = [
    'weapon', 'armor', 'gear',
    'vehicle-weapon', 'vehicle-gear',
    'starship-weapon', 'starship-gear',
];

describe('defaultImgForItemType', () => {
    it.each([
        'weapon', 'armor', 'gear', 'skill', 'specialization', 'action',
        'advantage', 'disadvantage', 'specialability', 'cybernetic',
        'manifestation', 'vehicle-weapon', 'vehicle-gear',
        'starship-weapon', 'starship-gear', 'character-template',
        'species-template', 'item-group',
    ])('returns the system-shipped default for %s', (type) => {
        expect(defaultImgForItemType(type)).toBe(`systems/od6s/icons/${type}-default.svg`);
    });

    it('falls back to mystery-man for unmapped types', () => {
        expect(defaultImgForItemType('unknown-future-type'))
            .toBe('icons/svg/mystery-man.svg');
    });
});

describe('prepareCharacterItems', () => {
    it('buckets each item-type into its named slot', () => {
        const items = [
            {type: 'gear', sort: 1},
            {type: 'skill', sort: 2},
            {type: 'specialization', sort: 3},
            {type: 'weapon', sort: 4},
            {type: 'armor', sort: 5},
            {type: 'advantage', sort: 6},
            {type: 'disadvantage', sort: 7},
            {type: 'specialability', sort: 8},
            {type: 'cybernetic', sort: 9},
            {type: 'manifestation', sort: 10},
            {type: 'action', sort: 11},
        ];
        const r = prepareCharacterItems(items);
        expect(r.gear).toHaveLength(1);
        expect(r.skills).toHaveLength(1);
        expect(r.specializations).toHaveLength(1);
        expect(r.weapons).toHaveLength(1);
        expect(r.armor).toHaveLength(1);
        expect(r.advantages).toHaveLength(1);
        expect(r.disadvantages).toHaveLength(1);
        expect(r.specialabilities).toHaveLength(1);
        expect(r.cybernetics).toHaveLength(1);
        expect(r.manifestations).toHaveLength(1);
        expect(r.actions).toHaveLength(1);
    });

    it('drops items of unrecognized types', () => {
        const r = prepareCharacterItems([
            {type: 'weapon', sort: 1},
            {type: 'character-template', sort: 2},
            {type: 'unknown', sort: 3},
        ]);
        expect(r.weapons).toHaveLength(1);
        // character-template is a known type but not part of the character
        // sheet's bucket set — it lives on the templates dialog flow.
        const allBucketed = Object.values(r).flat();
        expect(allBucketed).toHaveLength(1);
    });

    it('sorts each bucket ascending by sort field', () => {
        const r = prepareCharacterItems([
            {type: 'weapon', name: 'C', sort: 30},
            {type: 'weapon', name: 'A', sort: 10},
            {type: 'weapon', name: 'B', sort: 20},
        ]);
        expect(r.weapons.map((i) => i.name)).toEqual(['A', 'B', 'C']);
    });

    it('treats missing sort as 0 instead of producing NaN ordering', () => {
        const r = prepareCharacterItems([
            {type: 'weapon', name: 'has-sort', sort: 5},
            {type: 'weapon', name: 'no-sort'},
        ]);
        expect(r.weapons.map((i) => i.name)).toEqual(['no-sort', 'has-sort']);
    });

    it('stamps default image when img is missing or empty', () => {
        const items = [
            {type: 'weapon'},
            {type: 'armor', img: ''},
            {type: 'gear', img: 'icons/custom/sack.svg'},
        ];
        prepareCharacterItems(items);
        expect(items[0].img).toBe('systems/od6s/icons/weapon-default.svg');
        expect(items[1].img).toBe('systems/od6s/icons/armor-default.svg');
        expect(items[2].img).toBe('icons/custom/sack.svg');
    });
});

describe('prepareVehicleItems', () => {
    it('separates vehicle-weapon, vehicle-gear, skills, specializations', () => {
        const r = prepareVehicleItems([
            {type: 'vehicle-weapon', sort: 1},
            {type: 'vehicle-gear', sort: 2},
            {type: 'skill', sort: 3},
            {type: 'specialization', sort: 4},
        ], CARGO_TYPES);
        expect(r.vehicle_weapons).toHaveLength(1);
        expect(r.vehicle_gear).toHaveLength(1);
        expect(r.skills).toHaveLength(1);
        expect(r.specializations).toHaveLength(1);
        expect(r.cargo_hold).toHaveLength(0);
    });

    it('routes cross-scale equipped types into cargo-hold catch-all', () => {
        // A starship-weapon dropped onto a vehicle is cargo, not equipped.
        const r = prepareVehicleItems([
            {type: 'starship-weapon', sort: 1},
            {type: 'starship-gear', sort: 2},
            {type: 'gear', sort: 3},
        ], CARGO_TYPES);
        expect(r.vehicle_weapons).toHaveLength(0);
        expect(r.cargo_hold).toHaveLength(3);
    });

    it('ignores types not in the cargo list', () => {
        const r = prepareVehicleItems([
            {type: 'character-template', sort: 1},
            {type: 'action', sort: 2},
        ], CARGO_TYPES);
        expect(r.cargo_hold).toHaveLength(0);
        expect(r.vehicle_weapons).toHaveLength(0);
    });
});

describe('prepareStarshipItems', () => {
    it('separates starship-weapon, starship-gear, skills, specializations', () => {
        const r = prepareStarshipItems([
            {type: 'starship-weapon', sort: 1},
            {type: 'starship-gear', sort: 2},
            {type: 'skill', sort: 3},
            {type: 'specialization', sort: 4},
        ], CARGO_TYPES);
        expect(r.starship_weapons).toHaveLength(1);
        expect(r.starship_gear).toHaveLength(1);
        expect(r.skills).toHaveLength(1);
        expect(r.specializations).toHaveLength(1);
        expect(r.cargo_hold).toHaveLength(0);
    });

    it('routes cross-scale equipped types into cargo-hold catch-all', () => {
        // A vehicle-weapon dropped onto a starship is cargo, not equipped.
        const r = prepareStarshipItems([
            {type: 'vehicle-weapon', sort: 1},
            {type: 'vehicle-gear', sort: 2},
            {type: 'weapon', sort: 3},
        ], CARGO_TYPES);
        expect(r.starship_weapons).toHaveLength(0);
        expect(r.cargo_hold).toHaveLength(3);
    });
});

describe('prepareContainerItems', () => {
    it('returns all items in the container bucket and stamps defaults', () => {
        const items: {type: string; img?: string}[] = [
            {type: 'gear'},
            {type: 'weapon'},
        ];
        const r = prepareContainerItems(items);
        expect(r.container).toHaveLength(2);
        expect(items[0].img).toBe('systems/od6s/icons/gear-default.svg');
        expect(items[1].img).toBe('systems/od6s/icons/weapon-default.svg');
    });
});
