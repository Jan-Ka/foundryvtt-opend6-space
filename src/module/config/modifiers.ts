/**
 * Situational modifiers layered onto attack rolls: cover/concealment buckets,
 * called-shot location penalties (with optional damage adjustment), gravity
 * conditions, and the catch-all `misc` bucket left for ad-hoc modifiers.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export interface CoverModifier {
    modifier: number;
}

export const cover: Record<string, Record<string, CoverModifier>> = {
    "NONEX_IST_OD6S.COVER_SMOKE": {
        "NONEX_IST_OD6S.NONE": { modifier: 0 },
        "NONEX_IST_OD6S.COVER_LIGHT_SMOKE": { modifier: 3 },
        "NONEX_IST_OD6S.COVER_THICK_SMOKE": { modifier: 6 },
        "NONEX_IST_OD6S.COVER_VERY_THICK_SMOKE": { modifier: 12 },
    },
    "NONEX_IST_OD6S.COVER_LIGHT": {
        "NONEX_IST_OD6S.COVER_LIGHT_NONE": { modifier: 0 },
        "NONEX_IST_OD6S.COVER_POOR_LIGHT": { modifier: 3 },
        "NONEX_IST_OD6S.COVER_MOONLIGHT_NIGHT": { modifier: 6 },
        "NONEX_IST_OD6S.COVER_COMPLETE_DARKNESS": { modifier: 12 },
    },
    "NONEX_IST_OD6S.COVER": {
        "NONEX_IST_OD6S.NONE": { modifier: 0 },
        "NONEX_IST_OD6S.COVER_QUARTER": { modifier: 3 },
        "NONEX_IST_OD6S.COVER_HALF": { modifier: 6 },
        "NONEX_IST_OD6S.COVER_THREE_QUARTERS": { modifier: 12 },
        "NONEX_IST_OD6S.COVER_FULL": { modifier: 0 },
    },
};

export interface CalledShotModifier {
    modifier: number;
    damage: number;
}

export const calledShot: Record<string, CalledShotModifier> = {
    "NONEX_IST_OD6S.CALLED_SHOT_NONE": { modifier: 0, damage: 0 },
    "NONEX_IST_OD6S.CALLED_SHOT_LARGE": { modifier: 3, damage: 0 },
    "NONEX_IST_OD6S.CALLED_SHOT_MEDIUM": { modifier: 12, damage: 0 },
    "NONEX_IST_OD6S.CALLED_SHOT_SMALL": { modifier: 24, damage: 0 },
    "NONEX_IST_OD6S.CALLED_SHOT_HEAD": { modifier: 5, damage: 12 },
    "NONEX_IST_OD6S.CALLED_SHOT_HEART": { modifier: 15, damage: 12 },
    "NONEX_IST_OD6S.CALLED_SHOT_TORSO": { modifier: 0, damage: 0 },
    "NONEX_IST_OD6S.CALLED_SHOT_ARM": { modifier: 5, damage: -2 },
    "NONEX_IST_OD6S.CALLED_SHOT_LEG": { modifier: 5, damage: -1 },
    "NONEX_IST_OD6S.CALLED_SHOT_HAND": { modifier: 15, damage: -2 },
};

export const gravity: Record<string, CoverModifier> = {
    "NONEX_IST_OD6S.GRAVITY_STANDARD": { modifier: 0 },
    "NONEX_IST_OD6S.GRAVITY_LOW": { modifier: -3 },
    "NONEX_IST_OD6S.GRAVITY_NONE": { modifier: -6 },
    "NONEX_IST_OD6S.GRAVITY_HEAVY": { modifier: 9 },
};

export const misc: Record<string, CoverModifier> = {
    "NONEX_IST_OD6S.MISC": { modifier: 0 },
};
