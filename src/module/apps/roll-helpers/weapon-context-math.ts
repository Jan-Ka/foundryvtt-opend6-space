/**
 * Pure helpers extracted from the weapon-attack branch of setupRollData.
 * No Foundry globals — testable in isolation.
 */

import type { Modifier } from "./difficulty-math";

export interface WeaponMods {
    difficulty: number;
    attack: number;
    damage: number;
}

export interface ModTotals {
    damageScore: number;
    miscMod: number;
    bonusmod: number;
}

/**
 * Apply a weapon's `mods` block to the running roll totals. Only non-zero
 * mods contribute, mirroring the original guarded `+=` calls.
 */
export function applyWeaponMods(current: ModTotals, mods: WeaponMods): ModTotals {
    return {
        damageScore: current.damageScore + (mods.damage !== 0 ? mods.damage : 0),
        miscMod: current.miscMod + (mods.difficulty !== 0 ? mods.difficulty : 0),
        bonusmod: current.bonusmod + (mods.attack !== 0 ? mods.attack : 0),
    };
}

export interface StunFlagInputs {
    stunOnly: boolean | undefined;
    weaponStunScore: number;
    isExplosive: boolean;
    explosiveZonesEnabled: boolean;
    blastZone1StunDamage: number;
}

export interface StunFlags {
    onlyStun: boolean;
    canStun: boolean;
}

/**
 * Decide the `onlyStun` / `canStun` flags from a weapon's stun/blast fields.
 *
 * Note: the original code's explosive-without-zones branch read
 * `weapon.system.stun.damage`, but the weapon schema defines
 * `stun.{stun_only,score,type}` — there is no `stun.damage` field, so that
 * branch effectively never set `canStun` from a non-zero stun value. This
 * helper uses `weaponStunScore` consistently across the non-explosive and
 * explosive-without-zones branches, which is the apparent original intent.
 *
 * `stunOnly` accepts `undefined` because item systems that don't define a
 * `stun` block (e.g. vehicle weapons) yield `weapon.system.stun?.stun_only
 * === undefined`. The helper coerces to a strict boolean so callers can
 * forward the result into `RollData` without further guarding.
 */
export function computeStunFlags(input: StunFlagInputs): StunFlags {
    const onlyStun = Boolean(input.stunOnly);
    let canStun: boolean;
    if (input.isExplosive) {
        canStun = onlyStun || (input.explosiveZonesEnabled
            ? input.blastZone1StunDamage > 0
            : input.weaponStunScore > 0);
    } else {
        canStun = onlyStun || input.weaponStunScore > 0;
    }
    return { onlyStun, canStun };
}

export interface WeaponDamageEntry {
    penalty: number;
    label: string;
}

/**
 * Build the OD6S.WEAPON_DAMAGED damage modifier from a weapon's `damaged`
 * level. Returns null when `damaged <= 0` (weapon undamaged) or when the
 * level is not present in `table` (corrupted / out-of-range value).
 */
export function buildDamagedWeaponModifier(
    damaged: number,
    table: Record<number, WeaponDamageEntry>,
): (Modifier & { level: string }) | null {
    if (damaged <= 0) return null;
    const entry = table[damaged];
    if (!entry) return null;
    return {
        name: "OD6S.WEAPON_DAMAGED",
        value: -entry.penalty,
        level: entry.label,
    };
}

/**
 * Build the OD6S.STRENGTH_DAMAGE_BONUS damage modifier (added when the
 * weapon's `damage.muscle` flag is set).
 */
export function buildStrengthDamageModifier(strScore: number): Modifier {
    return {
        name: "OD6S.STRENGTH_DAMAGE_BONUS",
        value: strScore,
    };
}

export interface RamAttackContribution {
    /** Amount to add to bonusmod (0 when the vehicle has no `ram.score`). */
    bonusModIncrement: number;
    /** OD6S.ACTIVE_EFFECTS damage modifier, or null when ram_damage is 0. */
    modifier: Modifier | null;
}

/**
 * Compute the bonusmod and damage-modifier contributions for a vehicle ram
 * attack from the ram bonus / ram-damage scores.
 */
export function ramAttackContribution(ramScore: number, ramDamageScore: number): RamAttackContribution {
    return {
        bonusModIncrement: ramScore > 0 ? ramScore : 0,
        modifier: ramDamageScore > 0
            ? { name: "OD6S.ACTIVE_EFFECTS", value: ramDamageScore }
            : null,
    };
}
