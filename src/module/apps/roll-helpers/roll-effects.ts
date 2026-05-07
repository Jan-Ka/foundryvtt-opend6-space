/**
 * Small roll utility functions: effect modifiers, range calculation, and cancel action cleanup.
 */

import type {RollData} from "./roll-data";
import {isCharacterActor, isSpecializationItem} from "../../system/type-guards";
import {clearExplosivePending} from "../../system/utilities/explosives";
import {error as logError} from "../../system/logger";

export function getEffectMod(type: string, name: string, actor: Actor): number {
    if (!isCharacterActor(actor)) return 0;
    const sys = actor.system;
    if (type === 'skill') {
        if (typeof (sys.customeffects?.skills[name]) !== 'undefined') {
            return sys.customeffects.skills[name];
        }
    }

    if (type === 'specialization') {
        if (typeof (sys.customeffects?.specializations[name]) !== 'undefined') {
            return sys.customeffects.specializations[name];
        }

        const spec = actor.items.filter((i: Item) => i.type === type && i.name === name)[0];
        if (spec && isSpecializationItem(spec)) {
            if (typeof (sys.customeffects.skills[spec.system.skill]) !== 'undefined') {
                return sys.customeffects.skills[spec.system.skill];
            }
        }
    }

    return 0;
}

export function getRange(value: string, actor: Actor): string | number {
    if(isNaN(value as unknown as number) && value.toLowerCase().startsWith('str')) {
        const regex = /str/i;
        const newValue = value.replace(regex, String(actor.system.attributes.str.score));
        return new Roll(newValue).evaluateSync().total;
    } else {
        return value;
    }
}

export async function cancelAction(rollData: RollData): Promise<void> {
    if(rollData?.isExplosive) {
        const item = rollData.actor.items.find((i: Item) => i.id === rollData.itemid);
        const regionId = rollData.regionId;
        if (regionId) {
            try {
                await canvas.scene.deleteEmbeddedDocuments('Region', [regionId]);
            } catch (err) {
                // Region may already be gone (race / permission / stale id).
                // Leave a tagged breadcrumb so a stuck explosive marker can
                // be traced; cleanup of the item flag still runs below.
                logError('explosives', 'cancelAction: region delete failed', { regionId, err });
            }
            if (item) await clearExplosivePending(item, regionId);
        } else {
            // Manual (non-auto) path: only `explosiveSet` was written.
            await item?.unsetFlag('od6s', 'explosiveSet');
        }
    }
}
