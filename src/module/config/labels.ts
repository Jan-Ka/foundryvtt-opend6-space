/**
 * Static label maps and item-type allowlists for actor sheets, item filters, and template wizards.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export const actorTypeLabels = {
    "character": "ACTOR.TypeCharacter",
    "creature": "ACTOR.TypeCreature",
    "npc": "ACTOR.TypeNpc",
    "starship": "ACTOR.TypeStarship",
    "vehicle": "ACTOR.TypeVehicle",
};

export const itemLabels = {
    "skill": "OD6S.SKILL",
    "specialization": "OD6S.SPECIALIZATION",
    "advantage": "OD6S.ADVANTAGE",
    "disadvantage": "OD6S.DISADVANTAGE",
    "specialability": "OD6S.SPECIAL_ABILITY",
    "armor": "OD6S.ARMOR",
    "weapon": "OD6S.WEAPON",
    "gear": "OD6S.GEAR",
    "cybernetic": "OD6S.CYBERNETICS",
    "vehicle": "OD6S.VEHICLE",
    "manifestation": "OD6S.MANIFESTATION",
    "character-template": "OD6S.CHARACTER_TEMPLATE",
    "action": "OD6S.ACTION",
    "species-template": "ITEM.TypeSpecies-template",
    "starship-gear": "ITEM.TypeStarship-gear",
    "starship-weapon": "ITEM.TypeStarship-weapon",
    "vehicle-gear": "ITEM.TypeVehicle-gear",
    "vehicle-weapon": "ITEM.TypeVehicle-weapon",
};

export const templateItemTypes = {
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

export const allowedItemTypes = {
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
