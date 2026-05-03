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
