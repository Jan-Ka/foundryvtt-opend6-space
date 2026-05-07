/**
 * Difficulty bands used by the roll dialog and target-number lookup, plus
 * the short-code aliases referenced by item difficulty tags and the terrain
 * modifier table layered onto vehicle/movement rolls. Result tiers describe
 * how far a roll exceeded its target.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export interface DifficultyBand {
    min: number;
    max: number;
    dice: number;
}

export type DifficultyKey =
    | "OD6S.DIFFICULTY_UNKNOWN"
    | "OD6S.DIFFICULTY_CUSTOM"
    | "OD6S.DIFFICULTY_AUTOMATIC"
    | "OD6S.DIFFICULTY_VERY_EASY"
    | "OD6S.DIFFICULTY_EASY"
    | "OD6S.DIFFICULTY_MODERATE"
    | "OD6S.DIFFICULTY_DIFFICULT"
    | "OD6S.DIFFICULTY_VERY_DIFFICULT"
    | "OD6S.DIFFICULTY_HEROIC"
    | "OD6S.DIFFICULTY_LEGENDARY";

export const difficulty: Record<DifficultyKey, DifficultyBand> = {
    "OD6S.DIFFICULTY_UNKNOWN": { min: 0, max: 0, dice: 0 },
    "OD6S.DIFFICULTY_CUSTOM": { min: 0, max: 0, dice: 0 },
    "OD6S.DIFFICULTY_AUTOMATIC": { min: 0, max: 0, dice: 0 },
    "OD6S.DIFFICULTY_VERY_EASY": { min: 1, max: 5, dice: 1 },
    "OD6S.DIFFICULTY_EASY": { min: 6, max: 10, dice: 2 },
    "OD6S.DIFFICULTY_MODERATE": { min: 11, max: 15, dice: 4 },
    "OD6S.DIFFICULTY_DIFFICULT": { min: 16, max: 20, dice: 6 },
    "OD6S.DIFFICULTY_VERY_DIFFICULT": { min: 21, max: 25, dice: 8 },
    "OD6S.DIFFICULTY_HEROIC": { min: 26, max: 30, dice: 9 },
    "OD6S.DIFFICULTY_LEGENDARY": { min: 31, max: 40, dice: 10 },
};

export const difficultyShort: Record<string, DifficultyKey> = {
    VE: "OD6S.DIFFICULTY_VERY_EASY",
    E: "OD6S.DIFFICULTY_EASY",
    M: "OD6S.DIFFICULTY_MODERATE",
    D: "OD6S.DIFFICULTY_DIFFICULT",
    VD: "OD6S.DIFFICULTY_VERY_DIFFICULT",
    H: "OD6S.DIFFICULTY_HEROIC",
    L: "OD6S.DIFFICULTY_LEGENDARY",
};

export interface TerrainModifier {
    mod: number;
}

export const terrainDifficulty: Record<string, TerrainModifier> = {
    "OD6S.TERRAIN_EASY": { mod: 0 },
    "OD6S.TERRAIN_MODERATE": { mod: 5 },
    "OD6S.TERRAIN_ROUGH": { mod: 10 },
    "OD6S.TERRAIN_VERY_ROUGH": { mod: 15 },
    "OD6S.TERRAIN_HAZARDOUS": { mod: 20 },
    "OD6S.TERRAIN_VERY_HAZARDOUS": { mod: 25 },
};

export interface ResultTier {
    description: string;
    difference: number;
}

export const result: Record<string, ResultTier> = {
    "OD6S.FAILURE": { description: "OD6S.FAILURE", difference: -1 },
    "OD6S.RESULT_MINIMAL": { description: "OD6S.RESULT_MINIMAL_DESCRIPTION", difference: 0 },
    "OD6S.RESULT_SOLID": { description: "OD6S.RESULT_SOLID_DESCRIPTION", difference: 1 },
    "OD6S.RESULT_GOOD": { description: "OD6S.RESULT_GOOD_DESCRIPTION", difference: 5 },
    "OD6S.RESULT_SUPERIOR": { description: "OD6S.RESULT_SUPERIOR_DESCRIPTION", difference: 9 },
    "OD6S.RESULT_SPECTACULAR": { description: "OD6S.RESULT_SPECTACULAR_DESCRIPTION", difference: 13 },
    "OD6S.RESULT_INCREDIBLE": { description: "OD6S.RESULT_INCREDIBLE_DESCRIPTION", difference: 16 },
};
