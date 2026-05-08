import {od6sutilities} from "./system/utilities";
import OD6S from "./config/config-od6s";
import {isVehicleActor} from "./system/type-guards";
import {error as logError} from "./system/logger";

// Trust model for socketlib handlers
// ----------------------------------
// socketlib does not surface the originating user to a handler, so every
// authenticated mutation takes `userId` as its first argument. The handler
// looks the user up locally, then validates that user has the right
// permission on the target document (`testUserPermission`, message author
// match, crew membership) before mutating. A determined client can still
// forge `userId` on the wire — that's the same caveat every socketlib-using
// system has — but the check stops casual misuse: a non-author can't edit
// your roll message, a non-owner can't add their actor to your vehicle,
// etc. Read-only handlers (`checkCrewStatus`, `getVehicleFlag`,
// `triggerRoll*`) do not need the gate.

// --- Typed socket payloads ---------------------------------------------

interface CrewmemberRef {
    uuid: string;
    name?: string;
    sort?: number;
}

export interface VehicleDataPayload {
    uuid: string;
    name: string;
    type: string;
    crewmembers: CrewmemberRef[];
    [key: string]: unknown;
}

export interface ModifyShieldsPayload {
    uuid: string;
    system: { shields?: Record<string, unknown> };
    [key: string]: unknown;
}

export type ExplosiveRegionPayload =
    | {
          actorUuid: string;
          regionId: string;
          operation: "update";
          update: { x?: number; y?: number };
      }
    | {
          actorUuid: string;
          regionId: string;
          operation: "setFlags";
          flags: Array<{ flag: string; value: unknown }>;
      };

export interface DeleteExplosiveRegionPayload {
    actorUuid: string;
    regionId: string;
}

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

function denied(name: string, userId: string, reason: string): void {
    logError('socket', `${name} denied for user=${userId}: ${reason}`);
}

// A user may mutate vehicle state when they are a GM, own the vehicle
// itself, or own one of its current crewmembers. The crew-fallback covers
// flows like the dodge handoff in combat-hooks where a player owns the
// piloting actor but not the vehicle document.
async function userMayMutateVehicle(user: User, vehicle: Actor): Promise<boolean> {
    if (user.isGM) return true;
    if (vehicle.testUserPermission(user, 'OWNER')) return true;
    if (!isVehicleActor(vehicle)) return false;
    for (const member of vehicle.system.crewmembers ?? []) {
        const crew = await od6sutilities.getActorFromUuid(member.uuid);
        if (crew?.testUserPermission(user, 'OWNER')) return true;
    }
    return false;
}

async function updateRollMessage(userId: string, messageId: string, update: any) {
    const user = game.users.get(userId);
    if (!user) return denied('updateRollMessage', userId, 'unknown user');
    const message = game.messages.get(messageId);
    if (!message) return;
    if (!user.isGM && message.author?.id !== userId) {
        return denied('updateRollMessage', userId, `not author of message ${messageId}`);
    }
    await message.update(update, {diff: true});
    await message.setFlag('od6s', 'total', update.content);
    await message.setFlag('od6s', 'originalroll', message.rolls[0]);
    const difficulty = message.getFlag('od6s', 'difficulty') as number | undefined;
    if (typeof difficulty === 'number') {
        await message.setFlag('od6s', 'success', (+update.content) >= difficulty);
    }
}

async function updateInitRoll(userId: string, combatantId: string, initiative: number) {
    const user = game.users.get(userId);
    if (!user) return denied('updateInitRoll', userId, 'unknown user');
    if (!game.combat) return;
    const combatant = game.combat.combatants.get(combatantId);
    if (!combatant) return;
    if (!user.isGM && !combatant.actor?.testUserPermission(user, 'OWNER')) {
        return denied('updateInitRoll', userId, `not owner of combatant ${combatantId}`);
    }
    await combatant.update({initiative});
}

async function removeFromVehicle(userId: string, actorUuid: string, vehicleUuid: string) {
    const user = game.users.get(userId);
    if (!user) return denied('removeFromVehicle', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(actorUuid);
    if (!actor) return;
    if (!user.isGM && !actor.testUserPermission(user, 'OWNER')) {
        return denied('removeFromVehicle', userId, `not owner of actor ${actorUuid}`);
    }
    return await actor.removeFromCrew(vehicleUuid);
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

async function updateExplosiveRegion(userId: string, data: ExplosiveRegionPayload) {
    const user = game.users.get(userId);
    if (!user) return denied('updateExplosiveRegion', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(data.actorUuid);
    if (!actor) return denied('updateExplosiveRegion', userId, `unknown actor ${data.actorUuid}`);
    if (!user.isGM && !actor.testUserPermission(user, 'OWNER')) {
        return denied('updateExplosiveRegion', userId, `not owner of actor ${data.actorUuid}`);
    }
    const region = canvas.scene.getEmbeddedDocument('Region', data.regionId);
    if (!region) return;
    if (data.operation === "update") {
        const updatedShapes = foundry.utils.deepClone(region.shapes);
        if (data.update.x !== undefined) updatedShapes[0].x = data.update.x;
        if (data.update.y !== undefined) updatedShapes[0].y = data.update.y;
        return await region.update({ shapes: updatedShapes });
    } else if (data.operation === "setFlags") {
        for (const entry of data.flags) {
            await region.setFlag('od6s', entry.flag, entry.value);
        }
    }
}

async function deleteExplosiveRegion(userId: string, data: DeleteExplosiveRegionPayload) {
    const user = game.users.get(userId);
    if (!user) return denied('deleteExplosiveRegion', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(data.actorUuid);
    if (!actor) return denied('deleteExplosiveRegion', userId, `unknown actor ${data.actorUuid}`);
    if (!user.isGM && !actor.testUserPermission(user, 'OWNER')) {
        return denied('deleteExplosiveRegion', userId, `not owner of actor ${data.actorUuid}`);
    }
    if (data.regionId) {
        await canvas.scene.deleteEmbeddedDocuments('Region', [data.regionId]);
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
 * Broadcast vehicle stats to every crewmember actor so their cached
 * `system.vehicle` view stays in sync.
 */
async function sendVehicleData(userId: string, data: VehicleDataPayload) {
    const user = game.users.get(userId);
    if (!user) return denied('sendVehicleData', userId, 'unknown user');
    const vehicle = await od6sutilities.getActorFromUuid(data.uuid);
    if (!vehicle) return denied('sendVehicleData', userId, `unknown vehicle ${data.uuid}`);
    if (!(await userMayMutateVehicle(user, vehicle))) {
        return denied('sendVehicleData', userId, `not authorized for vehicle ${data.uuid}`);
    }
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
 * Update vehicle's shields from a crew-side action.
 */
async function modifyShields(userId: string, update: ModifyShieldsPayload) {
    const user = game.users.get(userId);
    if (!user) return denied('modifyShields', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(update.uuid);
    if (!actor) return;
    if (!(await userMayMutateVehicle(user, actor))) {
        return denied('modifyShields', userId, `not authorized for vehicle ${update.uuid}`);
    }
    await actor.update(update);
}

async function unlinkCrew(userId: string, crewId: string, vehicleId: string) {
    const user = game.users.get(userId);
    if (!user) return denied('unlinkCrew', userId, 'unknown user');
    const vehicle = await od6sutilities.getActorFromUuid(vehicleId);
    if (!vehicle) return;
    const crewActor = await od6sutilities.getActorFromUuid(crewId);
    const ownsCrew = crewActor?.testUserPermission(user, 'OWNER') ?? false;
    if (!user.isGM && !vehicle.testUserPermission(user, 'OWNER') && !ownsCrew) {
        return denied('unlinkCrew', userId, `not authorized for crew=${crewId} on vehicle=${vehicleId}`);
    }
    await (vehicle as any).sheet.unlinkCrew(crewId);
}

async function addToVehicle(userId: string, vehicleId: string, crewId: string) {
    const user = game.users.get(userId);
    if (!user) return denied('addToVehicle', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(crewId);
    if (!actor) return;
    if (!user.isGM && !actor.testUserPermission(user, 'OWNER')) {
        return denied('addToVehicle', userId, `not owner of actor ${crewId}`);
    }
    return await actor.addToCrew(vehicleId);
}

async function updateVehicle(userId: string, vehicleID: string, update: Record<string, unknown>) {
    const user = game.users.get(userId);
    if (!user) return denied('updateVehicle', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    if (!(await userMayMutateVehicle(user, actor))) {
        return denied('updateVehicle', userId, `not authorized for vehicle ${vehicleID}`);
    }
    return await actor.update(update);
}


async function getVehicleFlag(vehicleID: string, flag: string) {
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    return await actor.getFlag('od6s', flag);
}

async function setVehicleFlag(userId: string, vehicleID: string, flag: string, value: unknown) {
    const user = game.users.get(userId);
    if (!user) return denied('setVehicleFlag', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    if (!(await userMayMutateVehicle(user, actor))) {
        return denied('setVehicleFlag', userId, `not authorized for vehicle ${vehicleID}`);
    }
    return await actor.setFlag('od6s', flag, value);
}

async function unsetVehicleFlag(userId: string, vehicleID: string, flag: string) {
    const user = game.users.get(userId);
    if (!user) return denied('unsetVehicleFlag', userId, 'unknown user');
    const actor = await od6sutilities.getActorFromUuid(vehicleID);
    if (!actor) return;
    if (!(await userMayMutateVehicle(user, actor))) {
        return denied('unsetVehicleFlag', userId, `not authorized for vehicle ${vehicleID}`);
    }
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
