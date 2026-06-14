/**
 * Wound-track adjacent tables: body-point thresholds, wound-level → effect-id
 * map, hit-location 1d10 lookup, wild-die-result options, and the list of
 * status effects that the system applies automatically (hidden from the HUD).
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export const bodyPointLevels: Record<string, number> = {
    "NONEX_IST_OD6S.WOUNDS_HEALTHY": 9999,
    "NONEX_IST_OD6S.WOUNDS_STUNNED": 81,
    "NONEX_IST_OD6S.WOUNDS_WOUNDED": 60,
    "NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED": 40,
    "NONEX_IST_OD6S.WOUNDS_INCAPACITATED": 20,
    "NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED": 10,
    "NONEX_IST_OD6S.WOUNDS_DEAD": 1,
};

export const woundsId: Record<string, string> = {
    "NONEX_IST_OD6S.WOUNDS_HEALTHY": "healthy",
    "NONEX_IST_OD6S.WOUNDS_STUNNED": "stunned",
    "NONEX_IST_OD6S.WOUNDS_WOUNDED": "wounded",
    "NONEX_IST_OD6S.WOUNDS_SEVERELY_WOUNDED": "severely_wounded",
    "NONEX_IST_OD6S.WOUNDS_INCAPACITATED": "incapacitated",
    "NONEX_IST_OD6S.WOUNDS_MORTALLY_WOUNDED": "mortally_wounded",
    "NONEX_IST_OD6S.WOUNDS_DEAD": "dead",
};

export const hitLocations: Record<string, string> = {
    0: "NONEX_IST_OD6S.LOCATION_RIGHT_HAND",
    1: "NONEX_IST_OD6S.LOCATION_LEFT_HAND",
    2: "NONEX_IST_OD6S.LOCATION_RIGHT_LEG",
    3: "NONEX_IST_OD6S.LOCATION_RIGHT_FOOT",
    4: "NONEX_IST_OD6S.LOCATION_LEFT_LEG",
    5: "NONEX_IST_OD6S.LOCATION_LEFT_FOOT",
    6: "NONEX_IST_OD6S.LOCATION_ABDOMEN",
    7: "NONEX_IST_OD6S.LOCATION_CHEST",
    8: "NONEX_IST_OD6S.LOCATION_CHEST",
    9: "NONEX_IST_OD6S.LOCATION_HEAD",
};

export const wildDieResult: Record<number, string> = {
    0: "NONEX_IST_OD6S.WILD_RESULT_ONE",
    1: "NONEX_IST_OD6S.WILD_DIE_NONE",
    2: "NONEX_IST_OD6S.REMOVE_HIGHEST_DIE",
    3: "NONEX_IST_OD6S.COMPLICATION",
};

export const hiddenStatusEffects: readonly string[] = [
    "stunned",
    "wounded",
    "severely_wounded",
    "incapacitated",
    "mortally_wounded",
];
