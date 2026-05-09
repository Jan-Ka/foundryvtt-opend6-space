/**
 * Pure modifier accumulation for the roll-setup pipeline.
 *
 * Folds weapon mods (via `applyWeaponMods`), specialization/skill effect mods,
 * personal melee/brawl/dodge/parry/block mods, ranged-attack vehicle/personal
 * bonuses, and the vehicle-ram score into the orchestrator's running
 * `bonusmod` / `miscMod` totals.
 *
 * Extracted from `roll-setup.ts` phase 3 to keep the orchestrator readable.
 * Behaviour preserved end-to-end (RFC #103 single-add of `ram.score`,
 * type-classified weapon-routing intact).
 */

import {isAnyWeaponItem, isCharacterActor, isVehicleActor, isVehicleBorneWeaponItem} from "../../system/type-guards";
import {applyWeaponMods} from "./weapon-context-math";
import {getEffectMod} from "./roll-effects";
import type {ClassifiedRoll} from "./roll-data";

export interface ModAccumulatorInput {
    actor: Actor;
    item: Item | undefined;
    classified: ClassifiedRoll;
    subtype: string;
    isRangedSubtype: boolean;
}

export interface AccumulatedMods {
    bonusmod: number;
    miscMod: number;
}

export function accumulateRollMods(input: ModAccumulatorInput): AccumulatedMods {
    const {actor, item, classified, subtype, isRangedSubtype} = input;
    let bonusmod = 0;
    let miscMod = 0;

    // Weapon family: weapon mod difficulty / attack land on miscMod / bonusmod.
    // Gate on canonical `classified.type` (not item type) — action-routed
    // weapon attacks accumulate in the dedicated block below.
    const isWeaponClassifiedType = classified.type === 'weapon'
        || classified.type === 'starship-weapon'
        || classified.type === 'vehicle-weapon';
    if (item && isWeaponClassifiedType && isAnyWeaponItem(item)) {
        const wsys = item.system;
        const folded = applyWeaponMods({damageScore: 0, miscMod, bonusmod}, wsys.mods);
        miscMod = folded.miscMod;
        bonusmod = folded.bonusmod;

        const stats = wsys.stats;
        const ownsSpec = !!stats?.specialization
            && actor.items.some((i: Item) => i.type === 'specialization' && i.name === stats.specialization);
        const ownsSkill = !!stats?.skill
            && actor.items.some((i: Item) => i.type === 'skill' && i.name === stats.skill);
        if (ownsSpec) {
            bonusmod += +getEffectMod('specialization', stats.specialization!, actor);
        } else if (ownsSkill) {
            bonusmod += +getEffectMod('skill', stats.skill!, actor);
        }
    }

    if (item && classified.key === 'action-vehiclerangedweaponattack' && isVehicleBorneWeaponItem(item)) {
        const folded = applyWeaponMods({damageScore: 0, miscMod, bonusmod}, item.system.mods);
        miscMod = folded.miscMod;
        bonusmod = folded.bonusmod;
    }

    if (classified.type === 'skill' && item) {
        bonusmod += +getEffectMod('skill', item.name ?? '', actor);
    }
    if (classified.type === 'specialization' && item) {
        bonusmod += +getEffectMod('specialization', item.name ?? '', actor);
    }

    if (isCharacterActor(actor)) {
        const c = actor.system;
        if (subtype === 'meleeattack') bonusmod += c.melee.mod;
        if (subtype === 'brawlattack') bonusmod += c.brawl.mod;
        if (subtype === 'dodge') bonusmod += c.dodge.mod;
        if (subtype === 'parry') bonusmod += c.parry.mod;
        if (subtype === 'block') bonusmod += c.block.mod;
    }

    if (isRangedSubtype) {
        if (subtype.startsWith('vehicle')) {
            if (isVehicleActor(actor)
                && actor.system.embedded_pilot?.value
                && typeof actor.system.ranged?.score !== 'undefined') {
                bonusmod += +actor.system.ranged.score;
            } else if (isCharacterActor(actor)
                && typeof actor.system.vehicle?.ranged?.score !== 'undefined') {
                bonusmod += +actor.system.vehicle.ranged.score;
            }
        } else if (isCharacterActor(actor)) {
            bonusmod += +actor.system.ranged.mod;
        }
    }

    // RFC #103: vehicleramattack adds ram.score ONCE.
    if (classified.key === 'action-vehicleramattack') {
        const vehicleData = isCharacterActor(actor)
            ? actor.system.vehicle
            : isVehicleActor(actor)
                ? actor.system
                : undefined;
        if (typeof vehicleData?.ram?.score === 'number') {
            bonusmod += vehicleData.ram.score;
        }
    }

    return {bonusmod, miscMod};
}
