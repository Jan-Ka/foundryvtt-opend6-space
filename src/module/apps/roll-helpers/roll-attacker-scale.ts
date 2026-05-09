/**
 * Pure attacker-scale derivation for the roll-setup pipeline.
 *
 * Implements RFC #104: derive `attackerScale` from the actor unconditionally
 * for attack rolls (legacy gated on `targets.length === 1 && isAttack`,
 * leaving `attackerScale=0` for no-target attacks).
 *
 * Extracted from `roll-setup.ts` phase 4 to keep the orchestrator readable.
 */

import {isCharacterActor, isVehicleActor} from "../../system/type-guards";
import type {CanonicalRollType, RollTypeKey} from "./roll-data";

/**
 * Roll-type keys that always count as attacks for scale derivation. Hoisted
 * to module scope so `isAttackRollKey` doesn't reallocate the set per call.
 */
const ATTACK_KEYS: ReadonlySet<RollTypeKey> = new Set<RollTypeKey>([
    'weapon', 'starship-weapon', 'vehicle-weapon',
    'action-brawlattack',
    'action-vehicleramattack',
    'action-vehiclerangedweaponattack',
]);

export interface AttackerScaleInput {
    actor: Actor;
    classifiedKey: RollTypeKey;
    subtype: string;
    isAttackRoll: boolean;
    bucketAttackerScale: number | undefined;
}

export function deriveAttackerScale(input: AttackerScaleInput): number {
    const {actor, subtype, isAttackRoll, bucketAttackerScale} = input;

    if (typeof bucketAttackerScale === 'number' && bucketAttackerScale !== 0) {
        return bucketAttackerScale;
    }
    if (!isAttackRoll) return bucketAttackerScale ?? 0;

    const isVehicleSubtype = subtype.includes('vehicle');
    if (isVehicleSubtype) {
        if (isVehicleActor(actor)) return +(actor.system.scale?.score ?? 0);
        if (isCharacterActor(actor)) return +(actor.system.vehicle?.scale?.score ?? 0);
        return 0;
    }
    if (isCharacterActor(actor) || isVehicleActor(actor)) {
        return +(actor.system.scale?.score ?? 0);
    }
    return 0;
}

/**
 * Derive `isAttackRoll` from the classified roll. Captures the policy in
 * one place; previously assembled inline in roll-setup.ts.
 */
export function isAttackRollKey(
    key: RollTypeKey,
    classifiedType: CanonicalRollType,
    isRangedSubtype: boolean,
): boolean {
    if (ATTACK_KEYS.has(key)) return true;
    if (isRangedSubtype && (classifiedType === 'weapon' || classifiedType === 'starship-weapon' || classifiedType === 'vehicle-weapon')) {
        return true;
    }
    return key === 'action-rangedattack'
        || key === 'action-vehiclerangedattack'
        || key === 'action-meleeattack';
}
