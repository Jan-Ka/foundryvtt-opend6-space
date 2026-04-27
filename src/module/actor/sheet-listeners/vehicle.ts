import {OD6SAddCrew} from "../add-crew";
import {OD6SAddEmbeddedCrew} from "../add-embedded-crew";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Register vehicle-related event listeners on the actor sheet.
 */
export function registerVehicleListeners(html: any, sheet: any): void {
    const el = html[0];

    // Embedded Pilot
    el.querySelectorAll('.embedded-pilot-add').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            const data: any = {};
            data.targets = game.collections.get('Actor').filter((a: any) => a.type === 'npc' && !a.isToken);
            data.actor = sheet.document.uuid;
            await new OD6SAddEmbeddedCrew(data).render({force: true});
        }));

    el.querySelectorAll('.embedded-pilot-remove').forEach((elem: any) =>
        elem.addEventListener('click', async (_ev: any) => {
            // Remove skills/specs from the base actor
            let removeSkills = (sheet.document as any).skills.map((i: any) => i._id);
            removeSkills = removeSkills.concat((sheet.document as any).specializations.map((i: any) => i._id));
            if (removeSkills.length > 0) {
                await sheet.document.deleteEmbeddedDocuments('Item', removeSkills);
            }

            //zero out attributes
            const update: any = {};
            update.system = {};
            for (const a in sheet.document.system.attributes) {
                update[`system.attributes.${a}.base`] = 0;
                update[`system.embedded_pilot.actor`] = "";
            }
            await sheet.document.update(update);
            sheet.render();
        }));

    // Force-exit from vehicle
    el.querySelectorAll('.vehicle-exit').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            await sheet.document.setFlag('od6s', 'crew', '');
        }));

    // Open a crewmember's character sheet
    el.querySelectorAll('.crew-member').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            const actor = await od6sutilities.getActorFromUuid(ev.currentTarget.dataset.uuid);
            if (actor!.testUserPermission(game.user, "OWNER")) actor!.sheet.render(true)
        }));

    // Add/remove crew to vehicles
    el.querySelectorAll('.crew-add').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            const data: any = {};
            data.crew = [];
            if (typeof (game.scenes.active) === 'undefined') return;
            let tokens = game.scenes.active.tokens;

            // @ts-expect-error
            tokens = tokens.filter((t: any) => typeof (t.actor) !== "undefined" && t.actor !== '' && t.actor !== null);

            if (tokens.length === 0) {
                // @ts-expect-error
                !ui.notifications.warn(game.i18n.localize('OD6S.NO_TOKENS'));
                return;
            }

            // Filter out tokens who are a vehicle
            // @ts-expect-error
            tokens = tokens.filter((t: any) => t.actor.type !== "vehicle" && t.actor.type !== "starship");

            if (game.user.isGM) {
                // Filter out tokens who are already crew members in a vehicle
                // @ts-expect-error
                tokens = tokens.filter((t: any) => !(t.actor as any).isCrewMember());
            } else {
                // If a player, filter out hostile/neutral tokens
                // @ts-expect-error
                tokens = tokens.filter((t: any) => t.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY);

                // Filter out already-crewed tokens
                const crewed: any[] = [];
                for (let i = 0; i < tokens.length; i++) {
                    if (await OD6S.socket.executeAsGM("checkCrewStatus", tokens[i].actor.uuid)) {
                        crewed.push(tokens[i]);
                    }
                }

                // @ts-expect-error
                tokens = tokens.filter((e: any) => !crewed.includes(e));
            }

            if (tokens.length === 0) {
                // @ts-expect-error
                !ui.notifications.warn(game.i18n.localize('OD6S.NO_TOKENS'));
                return;
            }

            data.targets = tokens;
            data.actor = sheet.document.uuid;
            data.type = sheet.document.type;
            new OD6SAddCrew(data).render(true);
        }));

    el.querySelectorAll('.crew-delete').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            if (!game.user.isGM && sheet.document.uuid === ev.currentTarget.dataset.crewid) {
                return await OD6S.socket.executeAsGM('unlinkCrew', ev.currentTarget.dataset.crewid, ev.currentTarget.dataset.vehicleid);
            } else if (game.user.isGM && sheet.document.uuid === ev.currentTarget.dataset.crewid) {
                const vehicle = await od6sutilities.getActorFromUuid(ev.currentTarget.dataset.vehicleid)
                await vehicle!.sheet.unlinkCrew(sheet.document.uuid);
            } else {
                return await sheet.unlinkCrew(ev.currentTarget.dataset.crewid);
            }
        }));

    // Vehicle shield allocation
    el.querySelectorAll('.arc').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            const arc = ev.currentTarget.dataset.arc;
            const direction = ev.currentTarget.dataset.direction;
            const value = sheet.document.system.shields.value;
            let allocated = sheet.document.system.shields.allocated;
            let newValue = sheet.document.system.shields.arcs[arc].value;
            let doUpdate = false;

            if (direction === "up") {
                if (allocated < value) {
                    newValue++;
                    allocated++;
                    doUpdate = true;
                }
            } else {
                if (sheet.document.system.shields.arcs[arc].value > 0) {
                    newValue--;
                    allocated > 0 ? allocated-- : ui.notifications.error(game.i18n.localize('OD6S.ALLOCATION_ERROR'));
                    doUpdate = true;
                }
            }

            if (doUpdate) {
                const update: any = {};
                update._id = sheet.document.id;
                update.id = sheet.document.id;
                update.system = {};
                update.system.shields = {};
                update.system.shields.arcs = {};
                update.system.shields.arcs[arc] = {};
                update.system.shields.allocated = allocated;
                update.system.shields.arcs[arc].value = newValue;

                await sheet.document.update(update, {diff: true});
            }
        }));

    // Vehicle shield allocation by crew member
    el.querySelectorAll('.c-arc').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            const actor = await od6sutilities.getActorFromUuid(ev.currentTarget.dataset.uuid);
            const arc = ev.currentTarget.dataset.arc;
            const direction = ev.currentTarget.dataset.direction;
            const value = sheet.document.system.vehicle.shields.value;
            let allocated = sheet.document.system.vehicle.shields.allocated;
            let newValue = sheet.document.system.vehicle.shields.arcs[arc].value;
            let doUpdate = false;

            if (direction === "up") {
                if (allocated < value) {
                    newValue++;
                    allocated++;
                    doUpdate = true;
                }
            } else {
                if (sheet.document.system.vehicle.shields.arcs[arc].value > 0) {
                    newValue--;
                    allocated > 0 ? allocated-- : ui.notifications.error(game.i18n.localize('OD6S.ALLOCATION_ERROR'));
                    doUpdate = true;
                }
            }

            if (doUpdate) {
                const update: any = {};
                update.system = {};
                update.system.shields = {};
                update.system.shields.arcs = {};
                update.system.shields.arcs[arc] = {};
                update.system.shields.allocated = allocated;
                update.system.shields.arcs[arc].value = newValue;
                if (game.user.isGM) {
                    await actor!.update(update, {diff: true});
                } else {
                    update.uuid = ev.currentTarget.dataset.uuid;
                    (sheet.document as any).modifyShields(update)
                }
            }
        }));
}
