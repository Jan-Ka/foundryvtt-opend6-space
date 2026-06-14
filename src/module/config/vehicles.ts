/**
 * Vehicle scale tables: speed bands (used for both ramming damage and
 * to-hit modifiers) and ramming collision-type scores.
 * Mounted onto `OD6S` by `config-od6s.ts`.
 */

export interface VehicleSpeed {
    name: string;
    damage: number;
    mod: number;
}

export const vehicleSpeeds: Record<string, VehicleSpeed> = {
    stopped: { name: "NONEX_IST_OD6S.VEHICLE_SPEED_STOPPED", damage: 6, mod: 0 },
    cautious: { name: "NONEX_IST_OD6S.VEHICLE_SPEED_CAUTIOUS", damage: 12, mod: 0 },
    cruise: { name: "NONEX_IST_OD6S.VEHICLE_SPEED_CRUISE", damage: 18, mod: 0 },
    high: { name: "NONEX_IST_OD6S.VEHICLE_SPEED_HIGH", damage: 24, mod: 5 },
    all_out: { name: "NONEX_IST_OD6S.VEHICLE_SPEED_ALL_OUT", damage: 30, mod: 10 },
};

export interface CollisionType {
    name: string;
    score: number;
}

export const collisionTypes: Record<string, CollisionType> = {
    head_on: { name: "NONEX_IST_OD6S.VEHICLE_HEAD_ON", score: 9 },
    sidewipe: { name: "NONEX_IST_OD6S.VEHICLE_SIDESWIPE", score: -9 },
    rear_end: { name: "NONEX_IST_OD6S.VEHICLE_REAR_END", score: -9 },
    t_bone: { name: "NONEX_IST_OD6S.VEHICLE_T_BONE", score: 0 },
};
