/**
 * Wound-track adjacent tables: body-point thresholds, wound-level → effect-id
 * map, hit-location 1d10 lookup, wild-die-result options, and the list of
 * status effects that the system applies automatically (hidden from the HUD).
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export const bodyPointLevels: Record<string, number> = {
    "OD6S.WOUNDS_HEALTHY": 9999,
    "OD6S.WOUNDS_STUNNED": 81,
    "OD6S.WOUNDS_WOUNDED": 60,
    "OD6S.WOUNDS_SEVERELY_WOUNDED": 40,
    "OD6S.WOUNDS_INCAPACITATED": 20,
    "OD6S.WOUNDS_MORTALLY_WOUNDED": 10,
    "OD6S.WOUNDS_DEAD": 1,
};

export const woundsId: Record<string, string> = {
    "OD6S.WOUNDS_HEALTHY": "healthy",
    "OD6S.WOUNDS_STUNNED": "stunned",
    "OD6S.WOUNDS_WOUNDED": "wounded",
    "OD6S.WOUNDS_SEVERELY_WOUNDED": "severely_wounded",
    "OD6S.WOUNDS_INCAPACITATED": "incapacitated",
    "OD6S.WOUNDS_MORTALLY_WOUNDED": "mortally_wounded",
    "OD6S.WOUNDS_DEAD": "dead",
};

export const hitLocations: Record<string, string> = {
    0: "OD6S.LOCATION_RIGHT_HAND",
    1: "OD6S.LOCATION_LEFT_HAND",
    2: "OD6S.LOCATION_RIGHT_LEG",
    3: "OD6S.LOCATION_RIGHT_FOOT",
    4: "OD6S.LOCATION_LEFT_LEG",
    5: "OD6S.LOCATION_LEFT_FOOT",
    6: "OD6S.LOCATION_ABDOMEN",
    7: "OD6S.LOCATION_CHEST",
    8: "OD6S.LOCATION_CHEST",
    9: "OD6S.LOCATION_HEAD",
};

export const wildDieResult: Record<number, string> = {
    0: "OD6S.WILD_RESULT_ONE",
    1: "OD6S.WILD_DIE_NONE",
    2: "OD6S.REMOVE_HIGHEST_DIE",
    3: "OD6S.COMPLICATION",
};

export const hiddenStatusEffects: readonly string[] = [
    "stunned",
    "wounded",
    "severely_wounded",
    "incapacitated",
    "mortally_wounded",
];
