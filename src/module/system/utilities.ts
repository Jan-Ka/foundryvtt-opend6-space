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
    accessDeepProp(obj: any, path: any) {
        return converterUtils.accessDeepProp(obj, path);
    },
    async getWeaponRange(actor: any, item: any) {
        return weaponUtils.getWeaponRange(actor, item);
    },
    lookupAttributeKey(id: any) {
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
    getDiceFromScore(score: any) {
        return diceUtils.getDiceFromScore(score, OD6S.pipsPerDice);
    },
    getTextFromDice(dice: any) {
        return diceUtils.getTextFromDice(dice);
    },
    getScoreFromDice(dice: any, pips: any) {
        return diceUtils.getScoreFromDice(dice, pips, OD6S.pipsPerDice);
    },
    async getDifficultyFromLevel(level: any) {
        return difficultyUtils.getDifficultyFromLevel(level);
    },
    getWoundPenalty(actor: any) {
        return woundUtils.getWoundPenalty(actor);
    },
    getWoundLevel(value: any, actor: any) {
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
    async getSkillsFromTemplate(items: any) {
        return itemUtils.getSkillsFromTemplate(items);
    },
    async _getItemFromCompendiumId(id: any) {
        return itemUtils._getItemFromCompendiumId(id);
    },
    async _getItemFromCompendium(itemName: any) {
        return itemUtils._getItemFromCompendium(itemName);
    },
    async _getItemFromWorld(itemName: any) {
        return itemUtils._getItemFromWorld(itemName);
    },
    async getItemByName(itemName: any) {
        return itemUtils.getItemByName(itemName);
    },
    getItemsFromCompendiumByType(itemType: any) {
        return itemUtils.getItemsFromCompendiumByType(itemType);
    },
    getItemsFromWorldByType(itemType: any) {
        return itemUtils.getItemsFromWorldByType(itemType);
    },
    getAllItemsByType(itemType: any) {
        return itemUtils.getAllItemsByType(itemType);
    },
    mergeByProperty(target: any, source: any, prop: any) {
        return itemUtils.mergeByProperty(target, source, prop);
    },
    async getActorFromUuid(uuid: any) {
        return actorUtils.getActorFromUuid(uuid);
    },
    async getTokenFromUuid(uuid: any) {
        return actorUtils.getTokenFromUuid(uuid);
    },
    getScoreFromSkill(actor: any, spec: any, skill: any, attribute: any) {
        return skillUtils.getScoreFromSkill(actor, spec, skill, attribute);
    },
    getSensorTotal(actor: any, score: any) {
        return skillUtils.getSensorTotal(actor, score);
    },
    async autoOpposeRoll(msg: any) {
        return opposedUtils.autoOpposeRoll(msg);
    },
    async handleOpposedRoll() {
        return opposedUtils.handleOpposedRoll();
    },
    async generateOpposedRoll(token: any, msg: any) {
        return opposedUtils.generateOpposedRoll(token, msg);
    },
    getActorOwner(actor: any) {
        return actorUtils.getActorOwner(actor);
    },
    getInjury(damage: any, actorType: any) {
        return woundUtils.getInjury(damage, actorType);
    },
    waitFor3DDiceMessage(targetMessageId: any) {
        return miscUtils.waitFor3DDiceMessage(targetMessageId);
    },
    async handleEffectChange(effect: any) {
        return effectUtils.handleEffectChange(effect);
    },
    getTemplateFromMessage(message: any) {
        return miscUtils.getTemplateFromMessage(message);
    },
    async wait(ms: any) {
        return converterUtils.wait(ms);
    },
    getMeleeDamage(actor: any, weapon: any) {
        return weaponUtils.getMeleeDamage(actor, weapon);
    },
    evaluateChange(change: any, caller: any) {
        return effectUtils.evaluateChange(change, caller);
    },
    applyDerivedEffect(obj: any, change: any) {
        return effectUtils.applyDerivedEffect(obj, change);
    },
    boolCheck(value: any) {
        return converterUtils.boolCheck(value);
    },
};
