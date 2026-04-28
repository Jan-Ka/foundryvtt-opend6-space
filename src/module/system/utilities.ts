import OD6S from "../config/config-od6s";
import * as diceUtils from "./utilities/dice";
import * as converterUtils from "./utilities/converters";
import * as woundUtils from "./utilities/wounds";
import * as difficultyUtils from "./utilities/difficulty";
import * as itemUtils from "./utilities/items";
import * as actorUtils from "./utilities/actors";
import * as skillUtils from "./utilities/skills";
import * as explosiveUtils from "./utilities/explosives";
import * as effectUtils from "./utilities/effects";
import * as weaponUtils from "./utilities/weapons";
import * as opposedUtils from "./utilities/opposed";
import * as miscUtils from "./utilities/misc";

export const od6sutilities = {
    accessDeepProp(obj: Record<string, unknown>, path: string) {
        return converterUtils.accessDeepProp(obj, path);
    },
    async getWeaponRange(actor: Actor, item: Item) {
        return weaponUtils.getWeaponRange(actor, item);
    },
    lookupAttributeKey(id: string) {
        return miscUtils.lookupAttributeKey(id);
    },
    async scatterExplosive(range: any, origin: any, regionId: any) {
        return explosiveUtils.scatterExplosive(range, origin, regionId);
    },
    async getExplosiveTargets(actor: any, itemId: any) {
        return explosiveUtils.getExplosiveTargets(actor, itemId);
    },
    async detonateExplosives(combat: any) {
        return explosiveUtils.detonateExplosives(combat);
    },
    async detonateExplosive(data: any) {
        return explosiveUtils.detonateExplosive(data);
    },
    getBlastRadius(item: any, range: any) {
        return explosiveUtils.getBlastRadius(item, range);
    },
    getDiceFromScore(score: number) {
        return diceUtils.getDiceFromScore(score, OD6S.pipsPerDice);
    },
    getTextFromDice(dice: { dice: number; pips: number }) {
        return diceUtils.getTextFromDice(dice);
    },
    getScoreFromDice(dice: number, pips: number) {
        return diceUtils.getScoreFromDice(dice, pips, OD6S.pipsPerDice);
    },
    async getDifficultyFromLevel(level: string) {
        return difficultyUtils.getDifficultyFromLevel(level);
    },
    getWoundPenalty(actor: Actor) {
        return woundUtils.getWoundPenalty(actor);
    },
    getWoundLevel(value: number, actor: Actor) {
        return woundUtils.getWoundLevel(value, actor);
    },
    getDifficultyLevelSelect() {
        return difficultyUtils.getDifficultyLevelSelect();
    },
    getActiveAttributes() {
        return actorUtils.getActiveAttributes();
    },
    getActiveAttributesSelect() {
        return actorUtils.getActiveAttributesSelect();
    },
    async getSkillsFromTemplate(items: Item[]) {
        return itemUtils.getSkillsFromTemplate(items);
    },
    async _getItemFromCompendiumId(id: string) {
        return itemUtils._getItemFromCompendiumId(id);
    },
    async _getItemFromCompendium(itemName: string) {
        return itemUtils._getItemFromCompendium(itemName);
    },
    async _getItemFromWorld(itemName: string) {
        return itemUtils._getItemFromWorld(itemName);
    },
    async getItemByName(itemName: string) {
        return itemUtils.getItemByName(itemName);
    },
    getItemsFromCompendiumByType(itemType: OD6SItemType) {
        return itemUtils.getItemsFromCompendiumByType(itemType);
    },
    getItemsFromWorldByType(itemType: OD6SItemType) {
        return itemUtils.getItemsFromWorldByType(itemType);
    },
    getAllItemsByType(itemType: OD6SItemType) {
        return itemUtils.getAllItemsByType(itemType);
    },
    mergeByProperty(target: any, source: any, prop: any) {
        return itemUtils.mergeByProperty(target, source, prop);
    },
    async getActorFromUuid(uuid: string) {
        return actorUtils.getActorFromUuid(uuid);
    },
    async getTokenFromUuid(uuid: string) {
        return actorUtils.getTokenFromUuid(uuid);
    },
    getScoreFromSkill(actor: Actor, spec: string, skill: string, attribute: string) {
        return skillUtils.getScoreFromSkill(actor, spec, skill, attribute);
    },
    getSensorTotal(actor: Actor, score: number) {
        return skillUtils.getSensorTotal(actor, score);
    },
    async autoOpposeRoll(msg: ChatMessage) {
        return opposedUtils.autoOpposeRoll(msg);
    },
    async handleOpposedRoll() {
        return opposedUtils.handleOpposedRoll();
    },
    async generateOpposedRoll(token: TokenDocument, msg: ChatMessage) {
        return opposedUtils.generateOpposedRoll(token, msg);
    },
    getActorOwner(actor: Actor) {
        return actorUtils.getActorOwner(actor);
    },
    getInjury(damage: number, actorType: OD6SActorType | "system") {
        return woundUtils.getInjury(damage, actorType);
    },
    waitFor3DDiceMessage(targetMessageId: string) {
        return miscUtils.waitFor3DDiceMessage(targetMessageId);
    },
    async handleEffectChange(effect: ActiveEffect) {
        return effectUtils.handleEffectChange(effect);
    },
    getTemplateFromMessage(message: ChatMessage) {
        return miscUtils.getTemplateFromMessage(message);
    },
    async wait(ms: number) {
        return converterUtils.wait(ms);
    },
    getMeleeDamage(actor: Actor, weapon: Item) {
        return weaponUtils.getMeleeDamage(actor, weapon);
    },
    evaluateChange(change: ActiveEffectChange, caller: Actor | Item) {
        return effectUtils.evaluateChange(change, caller);
    },
    applyDerivedEffect(obj: Actor, change: ActiveEffectChange) {
        return effectUtils.applyDerivedEffect(obj, change);
    },
    boolCheck(value: unknown) {
        return converterUtils.boolCheck(value);
    },
};
