/**
 * Vehicle crew membership management: link an actor to a vehicle's crew or
 * remove them. Both call paths run from any user; non-GMs bounce the
 * actor-side mutation through the socket so the GM can apply it.
 *
 * Called from:
 *   - `sheet-helpers/drops.ts` (drag-drop onto a vehicle sheet)
 *   - `sheet-listeners/vehicle.ts` (the unlink button)
 *   - `add-crew.ts` (the "add crew" dialog)
 *   - `actor-helpers/crew-vehicle.ts` (auto re-link when a vehicle changes)
 *   - `socketlib.ts` (GM-side handler when a non-GM requested unlink)
 */

import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../../system/utilities";

type CrewmemberRef = {uuid: string; name?: string; sort?: number};

export async function linkCrew(vehicle: Actor, uuid: string): Promise<void> {
    // crewmembers is an array of {uuid, name, sort} objects, so .includes(uuid)
    // would always be false — match by .uuid to actually deduplicate.
    const existing: CrewmemberRef[] = (vehicle.system as {crewmembers: CrewmemberRef[]}).crewmembers;
    if (existing.some((c) => c.uuid === uuid)) return;

    const actor = await od6sutilities.getActorFromUuid(uuid);
    let result;
    if (game.user.isGM) {
        result = await actor!.addToCrew(vehicle.uuid);
    } else {
        result = await OD6S.socket.executeAsGM("addToVehicle", game.user.id, vehicle.uuid, uuid);
    }

    if (result) {
        const crew: CrewmemberRef = {uuid: actor!.uuid, name: actor!.name, sort: 0};
        await vehicle.update({
            id: vehicle.id,
            system: {crewmembers: [...existing, crew]},
        });
    }
}

export async function unlinkCrew(vehicle: Actor, crewID: string): Promise<void> {
    const crewMembers = (vehicle.system as {crewmembers: CrewmemberRef[]}).crewmembers.filter(
        (e) => e.uuid !== crewID,
    );

    if (await fromUuid(crewID)) {
        if (game.user.isGM) {
            const actor = await od6sutilities.getActorFromUuid(crewID);
            await actor!.removeFromCrew(vehicle.uuid);
        } else {
            await OD6S.socket.executeAsGM("removeFromVehicle", game.user.id, crewID, vehicle.uuid);
        }
    }

    await vehicle.update({
        id: vehicle.id,
        system: {crewmembers: crewMembers},
    });
}
