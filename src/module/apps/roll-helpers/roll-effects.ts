/**
 * Small roll utility functions: effect modifiers, range calculation, and cancel action cleanup.
 */

import type {RollData} from "./roll-data";

export function getEffectMod(type: string, name: string, actor: Actor): number {
    const sys = actor.system as OD6SCharacterSystem;
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
        if (typeof (spec) !== 'undefined') {
            const specSys = spec.system as OD6SSpecializationItemSystem;
            if (typeof (sys.customeffects.skills[specSys.skill]) !== 'undefined') {
                return sys.customeffects.skills[specSys.skill];
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
