/**
 * Pure item-categorization helpers consumed by `OD6SActorSheet._prepareContext`.
 *
 * `actor-sheet.ts` previously hand-rolled four near-identical
 * `_prepareCharacterItems` / `_prepareVehicleItems` / `_prepareStarshipItems`
 * / `_prepareContainerItems` methods, each iterating items, dispatching on
 * `item.type`, sorting per-bucket, and falling back to `CONST.DEFAULT_TOKEN`
 * for missing images. Those methods only ever ran during render, with no
 * external callers — extracting them keeps `actor-sheet.ts` focused on
 * Foundry's V2 sheet lifecycle.
 *
 * Per-item-type defaults come from `scripts/build-icons.mjs`, which
 * materializes one `<item.type>-default.svg` per known type from
 * `@iconify-json/game-icons` at build time. The build script errors if a
 * mapping can't resolve, so a typo here surfaces before runtime.
 */

const DEFAULT_ITEM_IMG_FALLBACK = 'icons/svg/mystery-man.svg';

const TYPED_DEFAULT_ITEM_TYPES = new Set([
    'weapon',
    'armor',
    'gear',
    'skill',
    'specialization',
    'action',
    'advantage',
    'disadvantage',
    'specialability',
    'cybernetic',
    'manifestation',
    'vehicle-weapon',
    'vehicle-gear',
    'starship-weapon',
    'starship-gear',
    'character-template',
    'species-template',
    'item-group',
]);

/**
 * Resolve the default image for an item type. Returns the system-shipped
 * sci-fi icon for known types; falls back to Foundry core's mystery-man
 * for any unmapped type so the sheet still renders something for future
 * additions.
 */
export function defaultImgForItemType(type: string): string {
    if (TYPED_DEFAULT_ITEM_TYPES.has(type)) {
        return `systems/od6s/icons/${type}-default.svg`;
    }
    return DEFAULT_ITEM_IMG_FALLBACK;
}

interface SheetItem {
    type: string;
    img?: string;
    sort?: number;
    // Sheet items are real Foundry Item document instances at runtime —
    // they carry many fields beyond what these helpers read. Open the
    // shape so callers can pass them through without repackaging.
    [key: string]: unknown;
}

const bySort = (a: SheetItem, b: SheetItem) => (a.sort ?? 0) - (b.sort ?? 0);

/**
 * Stamp a default image on items missing one. Mutates in place — matches
 * the legacy `i.img = i.img || CONST.DEFAULT_TOKEN` behavior; items in the
 * bucketed output and in `actor.items.contents` are the same references.
 */
function stampDefaultImg(items: readonly SheetItem[]): void {
    for (const i of items) {
        i.img = i.img || defaultImgForItemType(i.type);
    }
}

export interface CharacterItemBuckets {
    gear: SheetItem[];
    skills: SheetItem[];
    specializations: SheetItem[];
    weapons: SheetItem[];
    armor: SheetItem[];
    advantages: SheetItem[];
    disadvantages: SheetItem[];
    specialabilities: SheetItem[];
    cybernetics: SheetItem[];
    manifestations: SheetItem[];
    actions: SheetItem[];
}

export interface VehicleItemBuckets {
    vehicle_weapons: SheetItem[];
    vehicle_gear: SheetItem[];
    cargo_hold: SheetItem[];
    skills: SheetItem[];
    specializations: SheetItem[];
}

export interface StarshipItemBuckets {
    starship_weapons: SheetItem[];
    starship_gear: SheetItem[];
    cargo_hold: SheetItem[];
    skills: SheetItem[];
    specializations: SheetItem[];
}

export interface ContainerItemBuckets {
    container: SheetItem[];
}

export function prepareCharacterItems(items: readonly SheetItem[]): CharacterItemBuckets {
    stampDefaultImg(items);
    const buckets: CharacterItemBuckets = {
        gear: [],
        skills: [],
        specializations: [],
        weapons: [],
        armor: [],
        advantages: [],
        disadvantages: [],
        specialabilities: [],
        cybernetics: [],
        manifestations: [],
        actions: [],
    };
    for (const i of items) {
        switch (i.type) {
            case 'gear': buckets.gear.push(i); break;
            case 'skill': buckets.skills.push(i); break;
            case 'specialization': buckets.specializations.push(i); break;
            case 'weapon': buckets.weapons.push(i); break;
            case 'armor': buckets.armor.push(i); break;
            case 'advantage': buckets.advantages.push(i); break;
            case 'disadvantage': buckets.disadvantages.push(i); break;
            case 'specialability': buckets.specialabilities.push(i); break;
            case 'cybernetic': buckets.cybernetics.push(i); break;
            case 'manifestation': buckets.manifestations.push(i); break;
            case 'action': buckets.actions.push(i); break;
        }
    }
    for (const k of Object.keys(buckets) as (keyof CharacterItemBuckets)[]) {
        buckets[k].sort(bySort);
    }
    return buckets;
}

/**
 * Vehicle and starship buckets share the cargo-hold catch-all: any item of
 * a type listed in `OD6S.cargo_hold` that isn't a native equipped slot
 * (vehicle-weapon / vehicle-gear or starship-weapon / starship-gear)
 * falls into cargo. Without this, items added via the cargo-hold + dialog
 * across-scale are created but never displayed.
 */
function prepareVehicleLikeItems<EquippedKey extends string, GearKey extends string>(
    items: readonly SheetItem[],
    weaponType: EquippedKey,
    gearType: GearKey,
    cargoTypes: readonly string[],
): {
    weapons: SheetItem[];
    gear: SheetItem[];
    cargo_hold: SheetItem[];
    skills: SheetItem[];
    specializations: SheetItem[];
} {
    stampDefaultImg(items);
    const weapons: SheetItem[] = [];
    const gear: SheetItem[] = [];
    const cargo_hold: SheetItem[] = [];
    const skills: SheetItem[] = [];
    const specializations: SheetItem[] = [];
    for (const i of items) {
        if (i.type === 'skill') skills.push(i);
        else if (i.type === 'specialization') specializations.push(i);
        else if (i.type === weaponType) weapons.push(i);
        else if (i.type === gearType) gear.push(i);
        else if (cargoTypes.includes(i.type)) cargo_hold.push(i);
    }
    return {weapons, gear, cargo_hold, skills, specializations};
}

export function prepareVehicleItems(
    items: readonly SheetItem[],
    cargoTypes: readonly string[],
): VehicleItemBuckets {
    const r = prepareVehicleLikeItems(items, 'vehicle-weapon', 'vehicle-gear', cargoTypes);
    return {
        vehicle_weapons: r.weapons,
        vehicle_gear: r.gear,
        cargo_hold: r.cargo_hold,
        skills: r.skills,
        specializations: r.specializations,
    };
}

export function prepareStarshipItems(
    items: readonly SheetItem[],
    cargoTypes: readonly string[],
): StarshipItemBuckets {
    const r = prepareVehicleLikeItems(items, 'starship-weapon', 'starship-gear', cargoTypes);
    return {
        starship_weapons: r.weapons,
        starship_gear: r.gear,
        cargo_hold: r.cargo_hold,
        skills: r.skills,
        specializations: r.specializations,
    };
}

export function prepareContainerItems(items: readonly SheetItem[]): ContainerItemBuckets {
    stampDefaultImg(items);
    return {container: [...items]};
}
