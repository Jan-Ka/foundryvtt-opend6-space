import OD6S from "../config/config-od6s";
import {RollDialog} from "./roll-dialog";
import {setupRollData} from "./roll-helpers/roll-setup";
import {executeRollAction} from "./roll-helpers/roll-execute";
import {getDifficulty, applyDifficultyEffects, applyDamageEffects} from "./roll-helpers/roll-difficulty";
import {getEffectMod, getRange, cancelAction} from "./roll-helpers/roll-effects";
import type {RollData, IncomingRollData, MetaphysicsRollData} from "./roll-helpers/roll-data";

export class od6sroll {

    rollData: RollData | MetaphysicsRollData | undefined;
    static rollData: RollData | MetaphysicsRollData | undefined;

    activateListeners(html: HTMLElement) {
        // @ts-expect-error super reference in mixin-style class
        super.activateListeners(html);
    }

    async _onRollItem(event: Event) {
        const actor = (this as any).actor as Actor;
        const item = actor.items.find((i: Item) => i.id === (event.currentTarget as HTMLElement).dataset.itemId);
        if (!item) return;
        if ((actor.type === 'vehicle' || actor.type === 'starship') && actor.system.embedded_pilot) {
            return item.roll();
        }
        if (item.system?.subtype.includes("vehicle")) {
            if (item.system.subtype === 'vehiclerangedweaponattack') {
                return actor.rollAction(item.system.itemId);
            } else if (item.system.subtype === 'vehiclesensors') {
                if (game.settings.get('od6s', 'sensors')) {
                    if (item.name.includes(game.i18n.localize('OD6S.SENSORS_PASSIVE'))) {
                        return actor.rollAction('vehiclesensorspassive');
                    } else if (item.name.includes(game.i18n.localize('OD6S.SENSORS_SCAN'))) {
                        return actor.rollAction('vehiclesensorsscan');
                    } else if (item.name.includes(game.i18n.localize('OD6S.SENSORS_SEARCH'))) {
                        return actor.rollAction('vehiclesensorssearch');
                    } else if (item.name.includes(game.i18n.localize('OD6S.SENSORS_FOCUS'))) {
                        return actor.rollAction('vehiclesensorsfocus');
                    }
                }
            } else {
                return actor.rollAction(item.system.subtype);
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

    static async _metaphysicsRollDialog(item: Item, actor: Actor) {
        const skills: Record<string, { difficulty: string; skill: Item }> = {};

        for (const s in (item.system as any).skills) {
            let name: string | undefined;
            switch (s) {
                case 'channel':
                    name = OD6S.channelSkillName;
                    break;
                case 'sense':
                    name = OD6S.senseSkillName;
                    break;
                case 'transform':
                    name = OD6S.transformSkillName;
                    break;
                default:
                    break;
            }
            if ((item.system as any).skills[s].value) {
                const skill = actor.items.filter((i: Item) => i.name === name);
                if (typeof (skill[0]) !== 'undefined') {
                    skills[s] = {
                        difficulty: OD6S.difficultyShort[(item.system as any).skills[s].difficulty],
                        skill: skill[0],
                    };
                } else {
                    return ui.notifications.warn(
                        OD6S.metaphysicsSkills[s] + game.i18n.localize("OD6S.WARN_SKILL_NOT_FOUND")
                    )
                }
            }
        }

        const actions = Object.keys(skills).length;
        const actionpenalty = (+actions) + ((actor as any).actions.length) - 1;
        const stunnedpenalty = actor.system.stuns.current;

        this.rollData = {
            title: item.name,
            skills: skills,
            wilddie: Boolean(game.settings.get('od6s', 'use_wild_die') && actor.system.use_wild_die),
            showWildDie: game.settings.get('od6s', 'use_wild_die'),
            actor: actor,
            actionpenalty: actionpenalty,
            stunnedpenalty: stunnedpenalty,
            template: "systems/od6s/templates/metaphysicsRoll.html"
        } satisfies MetaphysicsRollData;

        new RollDialog(this, () => void od6sroll.rollAction()).render({force: true});
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
