/**
 * Weapon-related static config: type lists, attack-option modifiers, and range bands.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export interface WeaponTypeKey {
    key: string;
    name: string;
}

export interface AttackOption {
    attack: number;
    damage: number;
    multi?: boolean;
}

export interface RangeBand {
    name: string;
    difficulty: number;
    map: string;
    item: string;
}

export const weaponTypes: readonly string[] = [
    "NONEX_IST_OD6S.RANGED",
    "NONEX_IST_OD6S.MELEE",
    "NONEX_IST_OD6S.MISSILE",
    "NONEX_IST_OD6S.THROWN",
    "NONEX_IST_OD6S.EXPLOSIVE",
];

export const weaponTypeKeys: readonly WeaponTypeKey[] = [
    { "key": "NONEX_IST_OD6S.RANGED", "name": "Ranged" },
    { "key": "NONEX_IST_OD6S.MELEE", "name": "Melee" },
    { "key": "NONEX_IST_OD6S.MISSILE", "name": "Missile" },
    { "key": "NONEX_IST_OD6S.THROWN", "name": "Thrown" },
    { "key": "NONEX_IST_OD6S.EXPLOSIVE", "name": "Explosive" },
];

export const meleeDifficulties: readonly string[] = [
    "NONEX_IST_OD6S.DIFFICULTY_VERY_EASY",
    "NONEX_IST_OD6S.DIFFICULTY_EASY",
    "NONEX_IST_OD6S.DIFFICULTY_MODERATE",
    "NONEX_IST_OD6S.DIFFICULTY_DIFFICULT",
    "NONEX_IST_OD6S.DIFFICULTY_VERY_DIFFICULT",
    "NONEX_IST_OD6S.DIFFICULTY_HEROIC",
];

export const rangedAttackOptions: Record<string, AttackOption> = {
    "NONEX_IST_OD6S.ATTACK_STANDARD": {
        "attack": 0,
        "damage": 0,
        "multi": false,
    },
    "NONEX_IST_OD6S.ATTACK_RANGED_SINGLE_FIRE_AS_MULTI": {
        "attack": -3,
        "damage": +3,
        "multi": true,
    },
    "NONEX_IST_OD6S.ATTACK_RANGED_FULL_AUTO": {
        "attack": -6,
        "damage": 6,
        "multi": false,
    },
    "NONEX_IST_OD6S.ATTACK_RANGED_SWEEP": {
        "attack": -6,
        "damage": -9,
        "multi": false,
    },
    "NONEX_IST_OD6S.ATTACK_RANGED_BURST_FIRE_AS_SINGLE": {
        "attack": 0,
        "damage": -6,
        "multi": false,
    },
};

export const meleeAttackOptions: Record<string, AttackOption> = {
    "NONEX_IST_OD6S.ATTACK_STANDARD": { "attack": 0, "damage": 0, "multi": false },
    "NONEX_IST_OD6S.ATTACK_ALL_OUT": { "attack": -6, "damage": 3 },
    "NONEX_IST_OD6S.ATTACK_LUNGE": { "attack": 3, "damage": -3 },
    "NONEX_IST_OD6S.ATTACK_KNOCKDOWN_TRIP": { "attack": 6, "damage": 0 },
    "NONEX_IST_OD6S.ATTACK_PUSH": { "attack": 3, "damage": 0 },
};

export const brawlAttackOptions: Record<string, AttackOption> = {
    "NONEX_IST_OD6S.ATTACK_STANDARD": { "attack": 0, "damage": 0, "multi": false },
    "NONEX_IST_OD6S.ATTACK_ALL_OUT": { "attack": -6, "damage": 3 },
    "NONEX_IST_OD6S.ATTACK_GRAB": { "attack": 9, "damage": 0 },
    "NONEX_IST_OD6S.ATTACK_LUNGE": { "attack": 3, "damage": -3 },
    "NONEX_IST_OD6S.ATTACK_KNOCKDOWN_TRIP": { "attack": 6, "damage": 0 },
    "NONEX_IST_OD6S.ATTACK_PUSH": { "attack": 3, "damage": 0 },
    "NONEX_IST_OD6S.ATTACK_SWEEP": { "attack": -6, "damage": -9 },
    "NONEX_IST_OD6S.ATTACK_TACKLE": { "attack": 3, "damage": 0 },
};

export const ranges: Record<string, RangeBand> = {
    "NONEX_IST_OD6S.RANGE_POINT_BLANK_SHORT": {
        "name": "NONEX_IST_OD6S.RANGE_POINT_BLANK",
        "difficulty": -5,
        "map": "NONEX_IST_OD6S.DIFFICULTY_VERY_EASY",
        "item": "pb",
    },
    "NONEX_IST_OD6S.RANGE_SHORT_SHORT": {
        "name": "NONEX_IST_OD6S.RANGE_SHORT",
        "difficulty": 0,
        "map": "NONEX_IST_OD6S.DIFFICULTY_EASY",
        "item": "short",
    },
    "NONEX_IST_OD6S.RANGE_MEDIUM_SHORT": {
        "name": "NONEX_IST_OD6S.RANGE_MEDIUM",
        "difficulty": 5,
        "map": "NONEX_IST_OD6S.DIFFICULTY_MODERATE",
        "item": "medium",
    },
    "NONEX_IST_OD6S.RANGE_LONG_SHORT": {
        "name": "NONEX_IST_OD6S.RANGE_LONG",
        "difficulty": 10,
        "map": "NONEX_IST_OD6S.DIFFICULTY_DIFFICULT",
        "item": "long",
    },
};
