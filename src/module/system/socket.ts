import {od6sutilities} from "./utilities";

export default class OD6SSocketHandler {

    static async updateRollMessage(data: any) {
        if (game.user.isGM) {
            const message = game.messages.get(data.message._id)!;
            await message.update(data.update, {"diff": true});
            await message.setFlag('od6s', 'total', data.update.content);
            await message.setFlag('od6s', 'originalroll', message.rolls[0])
            if ((+data.update.content) >= (message.getFlag('od6s', 'difficulty') as number)) {
                await message.setFlag('od6s', 'success', true);
            }
            if ((+data.update.content) < (message.getFlag('od6s', 'difficulty') as number)) {
                await message.setFlag('od6s', 'success', false);
            }
        }
    }

    static async updateInitRoll(data: any) {
        if (game.user.isGM) {
            const actor = data.message.speaker.actor;
            const combatant = game.combat!.system.combatants.find((c: any) => c.actor.id === actor);
            const update = {
                id: combatant.id,
                initiative: data.update.content
            }
            await combatant.update(update);
        }
    }

    static async addToVehicle(data: any) {
        if (game.user.isGM) {
            const actor: any = await od6sutilities.getActorFromUuid(data.message.actorId);
            return await actor.addToCrew(data.message.vehicleId);
        }
    }

    static async removeFromVehicle(data: any) {
        if (game.user.isGM) {
            const actor: any = await od6sutilities.getActorFromUuid(data.message.actorId);
            return actor.removeFromCrew(data.message.vehicleId);
        }
    }

    static async sendVehicleStats(data: any) {
        if (game.user.isGM) {
            data.message.actors.forEach(function (actorId: any) {
                (game.actors.get(actorId) as any).getVehicleStats(data);
            });
        }
    }
}
