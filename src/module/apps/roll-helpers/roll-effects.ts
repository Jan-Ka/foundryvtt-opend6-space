/**
 * Small roll utility functions: effect modifiers, range calculation, and cancel action cleanup.
 */

import type {RollData} from "./roll-data";

export function getEffectMod(type: string, name: string, actor: Actor): number {
    if (type === 'skill') {
        if (typeof (actor.system.customeffects?.skills[name]) !== 'undefined') {
            return actor.system.customeffects.skills[name];
        }
    }

    if (type === 'specialization') {
        if (typeof (actor.system.customeffects?.specializations[name]) !== 'undefined') {
            return actor.system.customeffects.specializations[name];
        }

        const spec = actor.items.filter((i: Item) => i.type === type && i.name === name)[0];
        if (typeof (spec) !== 'undefined') {
            if (typeof (actor.system.customeffects.skills[spec.system.skill]) !== 'undefined') {
                return actor.system.customeffects.skills[spec.system.skill];
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
        const regionId = item?.getFlag('od6s','explosiveTemplate');
        if (regionId) {
            try {
                await canvas.scene.deleteEmbeddedDocuments('Region', [regionId]);
            } catch {}
        }
        await item?.unsetFlag('od6s', 'explosiveSet');
        await item?.unsetFlag('od6s', 'explosiveTemplate');
    }
}
