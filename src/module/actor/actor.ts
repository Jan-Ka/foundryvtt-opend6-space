import {od6sutilities} from "../system/utilities";
import {od6sroll} from "../apps/roll";
import OD6S from "../config/config-od6s";
import {isCharacterActor, isVehicleActor, isContainerActor, isSkillItem, isSpecializationItem} from "../system/type-guards";

import {resolveRollAction} from "./actor-helpers/roll-action";
import {prepareBaseActorData, prepareDerivedActorData, applyMods as applyModsHelper, setStrengthDamageBonus as setStrengthDamageBonusHelper, setInitiative as setInitiativeHelper, setResistance as setResistanceHelper} from "./actor-helpers/prepare-actor";
import {applyDamage as applyDamageHelper, calculateNewDamageLevel as calculateNewDamageLevelHelper, applyWounds as applyWoundsHelper, calculateNewWoundLevel as calculateNewWoundLevelHelper, triggerMortallyWoundedCheck as triggerMortallyWoundedCheckHelper, applyMortallyWoundedFailure as applyMortallyWoundedFailureHelper, applyIncapacitatedFailure as applyIncapacitatedFailureHelper, findFirstWoundLevel as findFirstWoundLevelHelper, getWoundLevelFromBodyPoints as getWoundLevelFromBodyPointsHelper, setWoundLevelFromBodyPoints as setWoundLevelFromBodyPointsHelper} from "./actor-helpers/wounds";
import {addEmbeddedPilot as addEmbeddedPilotHelper, addToCrew as addToCrewHelper, _verifyAddToCrew as _verifyAddToCrewHelper, removeFromCrew as removeFromCrewHelper, forceRemoveCrewmember as forceRemoveCrewmemberHelper, isCrewMember as isCrewMemberHelper, sendVehicleData as sendVehicleDataHelper, modifyShields as modifyShieldsHelper, vehicleCollision as vehicleCollisionHelper, onCargoHoldItemCreate as onCargoHoldItemCreateHelper} from "./actor-helpers/crew-vehicle";
import {useCharacterPointOnRoll as useCharacterPointOnRollHelper} from "./actor-helpers/resources";

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class OD6SActor extends Actor {

    get visible(): boolean {
        if (isContainerActor(this) && !game.user.isGM) {
            return !!this.system.visible;
        } else {
            return super.visible;
        }
    }

    /**
     * Augment the basic actor data with additional dynamic data.
     */
    async _preCreate(data: object, options: object, user: User) {
        await super._preCreate(data, options, user);
    }

    async _onCreate(data: object, options: object, user: User) {
        await super._onCreate(data, options, user);
        if (game.user.isGM || this.isOwner) {
            if (this.type === 'character') {
                const update: Record<string, unknown> = {};
                update.system = {
                    'created.value': false
                }
                update.id = this.id;
                await this.prototypeToken.update({
                    _id: this.id,
                    id: this.id,
                    displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
                    vision: true,
                    actorLink: true,
                    disposition: 1
                });
                await this.update(update);
            } else {
                await this.prototypeToken.update({
                    _id: this.id,
                    id: this.id,
                    displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
                });
            }

            if (this.type === 'container') {
                await this.prototypeToken.update({
                    _id: this.id,
                    id: this.id,
                    vision: false,
                    actorLink: true,
                    disposition: 0
                });
                const update: Record<string, unknown> = {};
                update.id = this.id;
                update[`ownership.default`] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
                await this.update(update);
            }
        }
    }

    /** @override */
    prepareData() {
        // Prepare data for the actor. Calling the super version of this executes
        // the following, in order: data reset (to clear active effects),
        // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
        // prepareDerivedData().
        super.prepareData();
    }

    /** @override */
    prepareBaseData() {
        // Must call super first — v14's Actor.prepareBaseData() runs _clearData()
        // which initializes tokenActiveEffectChanges, overrides, statuses, and the
        // _completedActiveEffectPhases set. Skipping super crashes applyActiveEffects.
        super.prepareBaseData();
        prepareBaseActorData(this);
    }

    getActionScoreText(action: string) {
        if (['character', 'creature', 'npc'].includes(this.type)) {
            const actionData = OD6S.actions[action];
            if(typeof actionData === 'undefined') {
                // Could be a vehicle action
                //return this.getVehicleActionScoreText(action)
            }
            if (actionData.skill !== '') {
                const skill = this.items.find(s => s.name === game.i18n.localize(actionData.skill) && s.type === 'skill');
                if (typeof skill !== 'undefined') {
                    return skill.getScoreText();
                }
            }
            const dice = od6sutilities.getDiceFromScore(this.system.attributes[actionData.base].score);
            return `${dice.dice}D+${dice.pips}`;
        }
    }

    getVehicleActionScore(action: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let vehicle: any;
        let pilot: Actor | null;

        if (isCharacterActor(this)) {
            vehicle = this.system.vehicle;
            pilot = this;
        } else if (isVehicleActor(this)) {
            vehicle = this.system;
            pilot = this.system.embedded_pilot.value ? this : null;
        } else {
            return undefined;
        }

        if(action === 'maneuver') {
            let score = vehicle.maneuverability.score;
            if (pilot) {
                let found = false;
                const spec = pilot.items.find(i => i.type === "specialization" &&
                    i.name === vehicle.specialization.value);
                if (spec !== undefined && isSpecializationItem(spec)) {
                    score = (+score) + (+spec.system.score) + (pilot.system.attributes[vehicle.attribute.value].score);
                    found = true;
                }

                if (!found) {
                    const skill = pilot.items.find(i => i.type === "skill" && i.name === vehicle.skill.value);
                    if (skill !== undefined && isSkillItem(skill)) {
                        score = (+score) + (+skill.system.score) + (pilot.system.attributes[vehicle.attribute.value].score);
                        found = true;
                    }
                }
                if (!found) {
                    score = (+score) + (pilot.system.attributes[vehicle.attribute.value].score);
                }
            }
            return score;
        } else if (action === 'ranged_attack') {
            // TODO
        } else if (action === 'ram') {
            // TODO
        } else if (action === 'dodge') {
            // TODO
        } else {
            // noop
        }
    }

    getVehicleActionScoreText(action: string) {
        const dice = od6sutilities.getDiceFromScore(this.getVehicleActionScore(action));
        if (typeof dice.dice === 'undefined' || isNaN(dice.dice)) return;
        return `${dice.dice}D+${dice.pips}`;
    }

    async prepareDerivedData() {
        return prepareDerivedActorData(this);
    }

    applyMods() {
        return applyModsHelper(this);
    }

    setStrengthDamageBonus() {
        return setStrengthDamageBonusHelper(this);
    }

    setInitiative() {
        return setInitiativeHelper(this);
    }

    async rollAttribute(attribute: string) {
        const data = {
            "actor": this,
            "itemId": "",
            "name": OD6S.attributes[attribute].name,
            "score": this.system.attributes[attribute].score,
            "type": "attribute"
        }
        await od6sroll._onRollDialog(data);
    }

    async rollAction(actionId: string, msg?: ChatMessage) {
        return resolveRollAction(this, actionId, msg);
    }

    async applyDamage(damage: string) {
        return applyDamageHelper(this, damage);
    }

    calculateNewDamageLevel(damage: string) {
        return calculateNewDamageLevelHelper(this, damage);
    }

    async applyWounds(wound: string) {
        return applyWoundsHelper(this, wound);
    }

    async triggerMortallyWoundedCheck() {
        return triggerMortallyWoundedCheckHelper(this);
    }

    async applyMortallyWoundedFailure() {
        return applyMortallyWoundedFailureHelper(this);
    }

    async applyIncapacitatedFailure() {
        return applyIncapacitatedFailureHelper(this);
    }

    findFirstWoundLevel(table: Record<string, { core: string; description?: string; penalty?: number }>, wound: string) {
        return findFirstWoundLevelHelper(this, table, wound);
    }

    calculateNewWoundLevel(wound: string) {
        return calculateNewWoundLevelHelper(this, wound);
    }

    getWoundLevelFromBodyPoints(bp?: number) {
        return getWoundLevelFromBodyPointsHelper(this, bp);
    }

    async setWoundLevelFromBodyPoints(bp: number) {
        return setWoundLevelFromBodyPointsHelper(this, bp);
    }

    setResistance(type: string) {
        return setResistanceHelper(this, type);
    }

    async addEmbeddedPilot(pilotActor: Actor) {
        return addEmbeddedPilotHelper(this, pilotActor);
    }

    async addToCrew(vehicleId: string) {
        return addToCrewHelper(this, vehicleId);
    }

    async _verifyAddToCrew(currentVehicleId: string, newVehicleId: string) {
        return _verifyAddToCrewHelper(this, currentVehicleId, newVehicleId);
    }

    async removeFromCrew(vehicleID: string) {
        return removeFromCrewHelper(this, vehicleID);
    }

    async forceRemoveCrewmember(crewID: string) {
        return forceRemoveCrewmemberHelper(this, crewID);
    }

    isCrewMember() {
        return isCrewMemberHelper(this);
    }

    async useCharacterPointOnRoll(message: ChatMessage) {
        return useCharacterPointOnRollHelper(this, message);
    }

    async modifyShields(update: Record<string, unknown>) {
        return modifyShieldsHelper(this, update);
    }

    async sendVehicleData(uuid?: string) {
        return sendVehicleDataHelper(this, uuid);
    }

    async vehicleCollision() {
        return vehicleCollisionHelper(this);
    }

    async onCargoHoldItemCreate(event: Event) {
        return onCargoHoldItemCreateHelper(this, event);
    }
}
