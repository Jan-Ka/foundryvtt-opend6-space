/**
 * Damage tables for personal weapons, armor, and vehicles, plus the
 * damage→wound-level threshold map and damage-type registry.
 * Mounted onto OD6S by `config-od6s.ts`.
 */

export const weaponDamage = {
    0: {
        label: "OD6S.NO_DAMAGE",
        penalty: 0
    },
    1: {
        label: "OD6S.DAMAGE_LIGHT",
        penalty: 3
    },
    2: {
        label: 'OD6S.DAMAGE_HEAVY',
        penalty: 6
    },
    3: {
        label: 'OD6S.DAMAGE_SEVERE',
        penalty: 999
    },
    4: {
        label: 'OD6S.DAMAGE_DESTROYED',
        penalty: 999
    }
};

export const armorDamage = {
    0: {
        label: "OD6S.NO_DAMAGE",
        woundLevel: "",
        penalty: 0
    },
    1: {
        label: "OD6S.DAMAGE_LIGHT",
        woundLevel: "",
        penalty: 1
    },
    2: {
        label: 'OD6S.DAMAGE_HEAVY',
        penalty: 3
    },
    3: {
        label: 'OD6S.DAMAGE_SEVERE',
        penalty: 999
    },
    4: {
        label: 'OD6S.DAMAGE_DESTROYED',
        penalty: 999
    }
};

export const damage = {
    "OD6S.WOUNDS_STUNNED": 1,
    "OD6S.WOUNDS_WOUNDED": 4,
    "OD6S.WOUNDS_INCAPACITATED": 9,
    "OD6S.WOUNDS_MORTALLY_WOUNDED": 13,
    "OD6S.WOUNDS_DEAD": 16
};

export const vehicleDamage = {
    "OD6S.NO_DAMAGE": {
        "damage": 0,
        "passenger_damage": "OD6S.PASSENGER_NO_DAMAGE",
        "passenger_damage_dice": 0
    },
    "OD6S.DAMAGE_VERY_LIGHT": {
        "damage": 1,
        "passenger_damage": "OD6S.PASSENGER_NO_DAMAGE",
        "passenger_damage_dice": 0
    },
    "OD6S.DAMAGE_LIGHT": {
        "damage": 4,
        "passenger_damage": "OD6S.PASSENGER_QUARTER_DAMAGE",
        "passenger_damage_dice": 1
    },
    "OD6S.DAMAGE_HEAVY": {
        "damage": 9,
        "passenger_damage": "OD6S.PASSENGER_HALF_DAMAGE",
        "passenger_damage_dice": 3
    },
    "OD6S.DAMAGE_SEVERE": {
        "damage": 13,
        "passenger_damage": "OD6S.PASSENGER_THREE_QUARTERS_DAMAGE",
        "passenger_damage_dice": 6
    },
    "OD6S.DAMAGE_DESTROYED": {
        "damage": 16,
        "passenger_damage": "OD6S.PASSENGER_FULL_DAMAGE",
        "passenger_damage_dice": 12
    }
};

export const damageTypes = {
    "p": "OD6S.PHYSICAL",
    "e": "OD6S.ENERGY"
};
