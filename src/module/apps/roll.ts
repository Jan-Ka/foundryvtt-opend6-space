import {RollDialog} from "./roll-dialog";
import {setupRollData} from "./roll-helpers/roll-setup";
import {executeRollAction} from "./roll-helpers/roll-execute";
import {isVehicleActor, isActionItem} from "../system/type-guards";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-helpers/roll-difficulty";
import {getEffectMod, getRange, cancelAction} from "./roll-helpers/roll-effects";
import type {RollData, IncomingRollData} from "./roll-helpers/roll-data";

export class od6sroll {

    rollData: RollData | undefined;
    static rollData: RollData | undefined;

    activateListeners(html: HTMLElement) {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onRollItem(event: Event) {
        const actor = (this as any).actor as Actor;
        const item = actor.items.find((i: Item) => i.id === (event.currentTarget as HTMLElement).dataset.itemId);
        if (!item) return;
        if (isVehicleActor(actor) && actor.system.embedded_pilot?.value) {
            return item.roll();
        }
        if (isActionItem(item) && item.system.subtype?.includes("vehicle")) {
            const sys = item.system;
            if (sys.subtype === 'vehiclerangedweaponattack') {
                return actor.rollAction(sys.itemId);
            } else if (sys.subtype === 'vehiclesensors') {
                if (game.settings.get('nonex-ist-od6s', 'sensors')) {
                    if (item.name.includes(game.i18n.localize('NONEX_IST_OD6S.SENSORS_PASSIVE'))) {
                        return actor.rollAction('vehiclesensorspassive');
                    } else if (item.name.includes(game.i18n.localize('NONEX_IST_OD6S.SENSORS_SCAN'))) {
                        return actor.rollAction('vehiclesensorsscan');
                    } else if (item.name.includes(game.i18n.localize('NONEX_IST_OD6S.SENSORS_SEARCH'))) {
                        return actor.rollAction('vehiclesensorssearch');
                    } else if (item.name.includes(game.i18n.localize('NONEX_IST_OD6S.SENSORS_FOCUS'))) {
                        return actor.rollAction('vehiclesensorsfocus');
                    }
                }
            } else {
                return actor.rollAction(sys.subtype);
            }
        } else {
            return item.roll();
        }
    }

    async _onRollEvent(event: Event) {
        event.preventDefault();
        const dataset = (event.currentTarget as HTMLElement).dataset;

        let score: number = 0;
        if (typeof dataset.score === "string") {
            const parsed = parseInt(dataset.score.replace(/['"]+/g, ''));
            score = isNaN(parsed) ? 0 : parsed;
        }

        const eventData: IncomingRollData = {
            name: dataset.label as string,
            score,
            type: dataset.type as string,
            actor: (this as any).actor as Actor,
            token: dataset.token,
            itemId: dataset.itemId ?? "",
            subtype: dataset.subtype,
        };

        await od6sroll._onRollDialog(eventData);
    }

    async rollPurchase(data: IncomingRollData) {
        await (this as any)._onRollDialog(data);
    }

    static async _onRollDialog(data: IncomingRollData) {
        const result = await setupRollData(data);
        if (result === false || result === undefined) return;

        this.rollData = result;

        new RollDialog(this, () => void od6sroll.rollAction()).render({force: true});
    }

    static async cancelAction(_ev?: Event) {
        await cancelAction(this.rollData as RollData);
    }

    static async rollAction() {
        return await executeRollAction(this.rollData as RollData);
    }

    static async getDifficulty(rollData: RollData) {
        return await getDifficulty(rollData);
    }

    static applyDifficultyEffects(rollData: RollData) {
        return applyDifficultyEffects(rollData);
    }

    static applyDamageEffects(rollData: RollData) {
        return applyDamageEffects(rollData);
    }

    static getEffectMod(type: string, name: string, actor: Actor) {
        return getEffectMod(type, name, actor);
    }

    static getRange(value: string, actor: Actor) {
        return getRange(value, actor);
    }
}
