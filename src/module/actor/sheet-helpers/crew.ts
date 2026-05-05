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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sheet = any;

export async function linkCrew(sheet: Sheet, uuid: string): Promise<void> {
    if (sheet.document.system.crewmembers.includes(uuid)) return;

    const actor = await od6sutilities.getActorFromUuid(uuid);
    let result;
    if (game.user.isGM) {
        result = await actor!.addToCrew(sheet.document.uuid);
    } else {
        result = await OD6S.socket.executeAsGM("addToVehicle", sheet.document.uuid, uuid);
    }

    if (result) {
        const crew = {uuid: actor!.uuid, name: actor!.name, sort: 0};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const update: any = {
            id: sheet.document.id,
            system: {crewmembers: sheet.document.system.crewmembers},
        };
        update.system.crewmembers.push(crew);
        await sheet.document.update(update);
    }
}

export async function unlinkCrew(sheet: Sheet, crewID: string): Promise<void> {
    const crewMembers = sheet.document.system.crewmembers.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => e.uuid !== crewID,
    );

    if (await fromUuid(crewID)) {
        if (game.user.isGM) {
            const actor = await od6sutilities.getActorFromUuid(crewID);
            await actor!.removeFromCrew(sheet.document.uuid);
        } else {
            game.socket.emit("system.od6s", {
                operation: "removeFromVehicle",
                message: {actorId: crewID, vehicleId: sheet.document.uuid},
            });
        }
    }

    await sheet.document.update({
        id: sheet.document.id,
        system: {crewmembers: crewMembers},
    });
}
