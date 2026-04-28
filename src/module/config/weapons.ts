/**
 * Weapon-related static config: type lists, attack-option modifiers, and range bands.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export const weaponTypes = [
    "OD6S.RANGED",
    "OD6S.MELEE",
    "OD6S.MISSILE",
    "OD6S.THROWN",
    "OD6S.EXPLOSIVE",
];

export const weaponTypeKeys = [
    { "key": "OD6S.RANGED", "name": "Ranged" },
    { "key": "OD6S.MELEE", "name": "Melee" },
    { "key": "OD6S.MISSILE", "name": "Missile" },
    { "key": "OD6S.THROWN", "name": "Thrown" },
    { "key": "OD6S.EXPLOSIVE", "name": "Explosive" },
];

export const meleeDifficulties = [
    "OD6S.DIFFICULTY_VERY_EASY",
    "OD6S.DIFFICULTY_EASY",
    "OD6S.DIFFICULTY_MODERATE",
    "OD6S.DIFFICULTY_DIFFICULT",
    "OD6S.DIFFICULTY_VERY_DIFFICULT",
    "OD6S.DIFFICULTY_HEROIC",
];

export const rangedAttackOptions = {
    "OD6S.ATTACK_STANDARD": {
        "attack": 0,
        "damage": 0,
        "multi": false,
    },
    "OD6S.ATTACK_RANGED_SINGLE_FIRE_AS_MULTI": {
        "attack": -3,
        "damage": +3,
        "multi": true,
    },
    "OD6S.ATTACK_RANGED_FULL_AUTO": {
        "attack": -6,
        "damage": 6,
        "multi": false,
    },
    "OD6S.ATTACK_RANGED_SWEEP": {
        "attack": -6,
        "damage": -9,
        "multi": false,
    },
    "OD6S.ATTACK_RANGED_BURST_FIRE_AS_SINGLE": {
        "attack": 0,
        "damage": -6,
        "multi": false,
    },
};

export const meleeAttackOptions = {
    "OD6S.ATTACK_STANDARD": { "attack": 0, "damage": 0, "multi": false },
    "OD6S.ATTACK_ALL_OUT": { "attack": -6, "damage": 3 },
    "OD6S.ATTACK_LUNGE": { "attack": 3, "damage": -3 },
    "OD6S.ATTACK_KNOCKDOWN_TRIP": { "attack": 6, "damage": 0 },
    "OD6S.ATTACK_PUSH": { "attack": 3, "damage": 0 },
};

export const brawlAttackOptions = {
    "OD6S.ATTACK_STANDARD": { "attack": 0, "damage": 0, "multi": false },
    "OD6S.ATTACK_ALL_OUT": { "attack": -6, "damage": 3 },
    "OD6S.ATTACK_GRAB": { "attack": 9, "damage": 0 },
    "OD6S.ATTACK_LUNGE": { "attack": 3, "damage": -3 },
    "OD6S.ATTACK_KNOCKDOWN_TRIP": { "attack": 6, "damage": 0 },
    "OD6S.ATTACK_PUSH": { "attack": 3, "damage": 0 },
    "OD6S.ATTACK_SWEEP": { "attack": -6, "damage": -9 },
    "OD6S.ATTACK_TACKLE": { "attack": 3, "damage": 0 },
};

export const ranges = {
    "OD6S.RANGE_POINT_BLANK_SHORT": {
        "name": "OD6S.RANGE_POINT_BLANK",
        "difficulty": -5,
        "map": "OD6S.DIFFICULTY_VERY_EASY",
        "item": "pb",
    },
    "OD6S.RANGE_SHORT_SHORT": {
        "name": "OD6S.RANGE_SHORT",
        "difficulty": 0,
        "map": "OD6S.DIFFICULTY_EASY",
        "item": "short",
    },
    "OD6S.RANGE_MEDIUM_SHORT": {
        "name": "OD6S.RANGE_MEDIUM",
        "difficulty": 5,
        "map": "OD6S.DIFFICULTY_MODERATE",
        "item": "medium",
    },
    "OD6S.RANGE_LONG_SHORT": {
        "name": "OD6S.RANGE_LONG",
        "difficulty": 10,
        "map": "OD6S.DIFFICULTY_DIFFICULT",
        "item": "long",
    },
};
