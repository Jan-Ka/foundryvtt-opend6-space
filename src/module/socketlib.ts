import {od6sutilities} from "./system/utilities";
import OD6S from "./config/config-od6s";
import {isVehicleActor} from "./system/type-guards";
import {error as logError} from "./system/logger";

// Wrap each handler so failures leave an `[od6s:socket]` breadcrumb instead of
// surfacing as bare "Uncaught (in promise)" rejections through socketlib.
function register(name: string, handler: (...args: any[]) => unknown): void {
    OD6S.socket.register(name, async (...args: unknown[]) => {
        try {
            return await handler(...args);
        } catch (err) {
            logError('socket', `${name} handler failed`, err);
            throw err;
        }
    });
}

export function registerSocketlib() {
    Hooks.once("socketlib.ready", () => {
        OD6S.socket = socketlib.registerSystem("od6s");
        register("checkCrewStatus", checkCrewStatus);
        register("sendVehicleData", sendVehicleData);
        register("modifyShields", modifyShields);
        register("unlinkCrew", unlinkCrew);
        register("addToVehicle", addToVehicle);
        register("updateVehicle", updateVehicle);
        register("triggerRoll", triggerRoll);
        register("triggerRollAction", triggerRollAction);
        register('updateExplosiveRegion', updateExplosiveRegion);
        register('deleteExplosiveRegion', deleteExplosiveRegion);
        register('getVehicleFlag', getVehicleFlag);
        register('setVehicleFlag', setVehicleFlag);
        register('unsetVehicleFlag', unsetVehicleFlag);
        register('updateRollMessage', updateRollMessage);
        register('updateInitRoll', updateInitRoll);
        register('removeFromVehicle', removeFromVehicle);
    });
}

async function updateRollMessage(messageId: string, update: any) {
    const message = game.messages.get(messageId);
    if (!message) return;
    await message.update(update, {diff: true});
    await message.setFlag('od6s', 'total', update.content);
    await message.setFlag('od6s', 'originalroll', message.rolls[0]);
    const difficulty = message.getFlag('od6s', 'difficulty') as number | undefined;
    if (typeof difficulty === 'number') {
        await message.setFlag('od6s', 'success', (+update.content) >= difficulty);
    }
}

async function updateInitRoll(combatantId: string, initiative: number) {
    if (!game.combat) return;
    const combatant = game.combat.combatants.get(combatantId);
    if (!combatant) return;
    await combatant.update({initiative});
}

async function removeFromVehicle(actorId: string, vehicleId: string) {
    const actor = await od6sutilities.getActorFromUuid(actorId);
    if (!actor) return;
    return await actor.removeFromCrew(vehicleId);
}

async function triggerRoll(type: string, actorId: string) {
    const actor = await od6sutilities.getActorFromUuid(actorId);
    if (!actor) return;
    if (type === 'mortally_wounded') {
        if (actor.hasPlayerOwner && actor.isOwner && !game.user.isGM) {
            actor.triggerMortallyWoundedCheck();
        } else if (!actor.hasPlayerOwner && game.user.isGM) {
            actor.triggerMortallyWoundedCheck();
        }
    }
}

async function triggerRollAction(type: string, actorId: string) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return await actor.rollAction(type);
}

async function updateExplosiveRegion(data: any) {
    const region = canvas.scene.getEmbeddedDocument('Region', data.regionId);
    if (!region) return;
    if (data.operation === "update") {
        const updatedShapes = foundry.utils.deepClone(region.shapes);
        if (data.update.x !== undefined) updatedShapes[0].x = data.update.x;
        if (data.update.y !== undefined) updatedShapes[0].y = data.update.y;
        return await region.update({ shapes: updatedShapes });
    } else if (data.operation === "setFlags") {
        for (const flag in data.flags) {
            await region.setFlag('od6s', data.flags[flag].flag, data.flags[flag].value);
        }
    }
}

async function deleteExplosiveRegion(data: any) {
    const regionId = data.regionId;
    if (regionId) {
        await canvas.scene.deleteEmbeddedDocuments('Region', [regionId]);
    }
}

/**
 * Check is an actor is crewing a vehicle
 * @param actorId
 * @returns {boolean|*}
 */
async function checkCrewStatus(actorId: string) {
    const actor = await od6sutilities.getActorFromUuid(actorId);
    if (!actor) return false;
    return actor.isCrewMember();
}

/**
 * Update actor's vehicle data
 * @param data
 */
async function sendVehicleData(data: any) {
    for (const e of data.crewmembers) {
        const actor = await od6sutilities.getActorFromUuid(e.uuid);
        if (!actor) continue;
        const update: any = {};
        update.system = {};
        update.id = actor.id;
        update.system.vehicle = data;
        await actor.update(update);
    }
}

/**
 * Update vehicle's shields from actor
 * @param update
 * @returns {Promise<void>}
 */
async function modifyShields(update: any) {
    const actor = await od6sutilities.getActorFromUuid(update.uuid);
    if (!actor) return;
    await actor.update(update);
}

/**
 * Remove crewmwmber
 * @param vehicleId
 * @param crewId
 * @returns {Promise<void>}
 */
async function unlinkCrew(crewId: string, vehicleId: string) {
    const vehicle = await od6sutilities.getActorFromUuid(vehicleId);
    if (!vehicle) return;
    await (vehicle as any).sheet.unlinkCrew(crewId);
}

/**
 * Add crewmember
 * @param vehicleId
 * @param crewId
 * @returns {Promise<void>}
 */
async function addToVehicle(vehicleId: string, crewId: string) {
    const actor = await od6sutilities.getActorFromUuid(crewId);
    if (!actor) return;
    return await actor.addToCrew(vehicleId);
}

/**
 * Update a vehicle
 * @param vehicleID
 * @param update
 * @returns {Promise<*>}
 */
async function updateVehicle(vehicleID: string, update: any) {
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    return await actor.update(update);
}


async function getVehicleFlag(vehicleID: string, flag: string) {
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    return await actor.getFlag('od6s', flag);
}

async function setVehicleFlag(vehicleID: string, flag: string, value: any) {
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    return await actor.setFlag('od6s', flag, value);
}

async function unsetVehicleFlag(vehicleID: string, flag: string) {
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    return await actor.unsetFlag('od6s', flag);
}

export async function getActorFromUuid(uuid: any) {
    return od6sutilities.getActorFromUuid(uuid);
}

export async function promptResistanceRolls(msg: any) {
    if(game.user.isGM) return;
    if (msg.getFlag('od6s','type') === 'damage' && OD6S.autoPromptPlayerResistance) {
        const target = game.scenes.active.tokens.get(msg.getFlag('od6s', 'targetId'));

        if (msg.getFlag('od6s', 'wild') && !msg.getFlag('od6s', 'wildHandled')) return;

        if (typeof (target) !== 'undefined' && target) {
            if (isVehicleActor(target.actor)) {
                if(!target.actor.isOwner) return;
                if (target.actor.system.crewmembers.length < 1) return;
                const crew = await od6sutilities.getActorFromUuid(target.actor.system.crewmembers[0].uuid);
                if (crew && crew.hasPlayerOwner && crew.isOwner) {
                    return crew.rollAction('vehicletoughness', msg);
                }
            }


            if (!game.user.isGM && target.actor.hasPlayerOwner && target.isOwner) {
                const resistType = msg.getFlag('od6s', 'damageType') + 'r';
                return target.actor.rollAction(resistType, msg);
            }
        }
    }
    return undefined;
}
