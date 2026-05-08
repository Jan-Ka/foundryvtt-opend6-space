/**
 * Type-predicate helpers that narrow `Actor` / `Item` to the discriminated
 * union variants defined in `types/od6s.d.ts`. Use these instead of
 * `actor.system as OD6SCharacterSystem` casts — the predicate narrows
 * `system` at the call site so per-access casts disappear.
 */

export function isCharacterActor(actor: Actor): actor is OD6SCharacterActor {
    return actor.type === "character" || actor.type === "npc" || actor.type === "creature";
}

export function isVehicleActor(actor: Actor): actor is OD6SVehicleActor {
    return actor.type === "vehicle" || actor.type === "starship";
}

export function isContainerActor(actor: Actor): actor is OD6SContainerActor {
    return actor.type === "container";
}

export function isStarshipActor(actor: Actor): actor is OD6SVehicleActor & { type: "starship" } {
    return actor.type === "starship";
}

export function isWeaponItem(item: Item): item is OD6SWeaponItem {
    return item.type === "weapon";
}

export function isArmorItem(item: Item): item is OD6SArmorItem {
    return item.type === "armor";
}

export function isSkillItem(item: Item): item is OD6SSkillItem {
    return item.type === "skill";
}

export function isSpecializationItem(item: Item): item is OD6SSpecializationItem {
    return item.type === "specialization";
}

export function isVehicleWeaponItem(item: Item): item is OD6SVehicleWeaponItem {
    return item.type === "vehicle-weapon";
}

export function isStarshipWeaponItem(item: Item): item is OD6SStarshipWeaponItem {
    return item.type === "starship-weapon";
}

export function isActionItem(item: Item): item is OD6SActionItem {
    return item.type === "action";
}

export function isItemGroupItem(item: Item): item is OD6SItemGroupItem {
    return item.type === "item-group";
}

export function isCharacterTemplateItem(item: Item): item is OD6SCharacterTemplateItem {
    return item.type === "character-template";
}

/**
 * Combined guard for the three template-shaped item types whose system data
 * carries a `system.items` array (item-group, character-template, species-template).
 * Use when the surrounding code reads/writes that nested item list.
 */
export function isTemplateLikeItem(
    item: Item,
): item is OD6SItemGroupItem | OD6SCharacterTemplateItem | OD6SSpeciesTemplateItem {
    return (
        item.type === "item-group" ||
        item.type === "character-template" ||
        item.type === "species-template"
    );
}

/**
 * Combined guard for any weapon-family item. Use when the surrounding code
 * accesses fields shared across the three weapon types (e.g. `mods`,
 * `damaged`, `subtype`) rather than vehicle/starship-only fields.
 */
export function isAnyWeaponItem(
    item: Item,
): item is OD6SWeaponItem | OD6SVehicleWeaponItem | OD6SStarshipWeaponItem {
    return item.type === "weapon" || item.type === "vehicle-weapon" || item.type === "starship-weapon";
}

/**
 * Combined guard for vehicle-borne weapon items. Narrows to the union that
 * carries vehicle-weapon-specific fields (`fire_control`, `stats`, `subtype`).
 */
export function isVehicleBorneWeaponItem(
    item: Item,
): item is OD6SVehicleWeaponItem | OD6SStarshipWeaponItem {
    return item.type === "vehicle-weapon" || item.type === "starship-weapon";
}
