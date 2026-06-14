/**
 * Static label maps and item-type allowlists for actor sheets, item filters, and template wizards.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export const actorTypeLabels: Record<string, string> = {
    "character": "ACTOR.TypeCharacter",
    "creature": "ACTOR.TypeCreature",
    "npc": "ACTOR.TypeNpc",
    "starship": "ACTOR.TypeStarship",
    "vehicle": "ACTOR.TypeVehicle",
};

export const itemLabels: Record<string, string> = {
    "skill": "NONEX_IST_OD6S.SKILL",
    "specialization": "NONEX_IST_OD6S.SPECIALIZATION",
    "advantage": "NONEX_IST_OD6S.ADVANTAGE",
    "disadvantage": "NONEX_IST_OD6S.DISADVANTAGE",
    "specialability": "NONEX_IST_OD6S.SPECIAL_ABILITY",
    "armor": "NONEX_IST_OD6S.ARMOR",
    "weapon": "NONEX_IST_OD6S.WEAPON",
    "gear": "NONEX_IST_OD6S.GEAR",
    "cybernetic": "NONEX_IST_OD6S.CYBERNETICS",
    "vehicle": "NONEX_IST_OD6S.VEHICLE",
    "manifestation": "NONEX_IST_OD6S.MANIFESTATION",
    "character-template": "NONEX_IST_OD6S.CHARACTER_TEMPLATE",
    "action": "NONEX_IST_OD6S.ACTION",
    "species-template": "ITEM.TypeSpecies-template",
    "starship-gear": "ITEM.TypeStarship-gear",
    "starship-weapon": "ITEM.TypeStarship-weapon",
    "vehicle-gear": "ITEM.TypeVehicle-gear",
    "vehicle-weapon": "ITEM.TypeVehicle-weapon",
};

export const templateItemTypes: Record<string, string[]> = {
    "character-template": [
        "skill",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation",
    ],
    "species-template": [
        "specialability",
    ],
    "item-group": [
        "skill",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear",
    ],
};

export const allowedItemTypes: Record<string, string[]> = {
    "container": [
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear",
    ],
    "character": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation",
        "character-template",
        "species-template",
    ],
    "npc": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "species-template",
    ],
    "creature": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
    ],
    "vehicle": [
        "vehicle-weapon",
        "vehicle-gear",
    ],
    "starship": [
        "starship-weapon",
        "starship-gear",
    ],
};
