import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

declare const foundry: any;

export async function addEmbeddedPilot(actor: any, pilotActor: any): Promise<void> {
    /* Copy attributes and items to vehicle */
    const update = {};

    await actor.createEmbeddedDocuments('Item',
        pilotActor.items.filter((s: any) => s.type === 'skill' || s.type === "specialization"));
    (update as any)[`system.attributes`] = pilotActor.system.attributes;
    (update as any)[`system.embedded_pilot.actor`] = pilotActor;
    await actor.update(update);
}

export async function addToCrew(actor: any, vehicleId: any): Promise<any> {
    if (actor.isCrewMember()) {
        const currentVehicle = await fromUuid(await actor.getFlag('od6s', 'crew'));
        const newVehicle = await fromUuid(vehicleId);

        const data = {
            "vehicleId": vehicleId,
            "currentVehicleName": currentVehicle.name,
            "newVehicleName": newVehicle.name
        };

        const addTemplate = "systems/od6s/templates/actor/common/verify-new-crew.html";
        const html = await renderTemplate(addTemplate, data);
        const label = game.i18n.localize("OD6S.TRANSFER_VEHICLE");

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: label },
            content: html,
            yes: { label: game.i18n.localize("OD6S.OK") },
        });
        if (confirmed) await actor._verifyAddToCrew(currentVehicle.uuid, vehicleId);
    } else {
        return await actor.setFlag('od6s', 'crew', vehicleId);
    }
}

export async function _verifyAddToCrew(actor: any, currentVehicleId: any, newVehicleId: any): Promise<void> {
    const oldVehicle = await fromUuid(currentVehicleId);
    let oldActor;
    if (oldVehicle.documentName === "Token") {
        oldActor = oldVehicle.actor;
    } else {
        oldActor = oldVehicle;
    }
    await oldActor.sheet.unlinkCrew(actor.uuid);

    const newVehicle = await fromUuid(newVehicleId);
    let newActor;
    if (newVehicle.documentName === "Token") {
        newActor = newVehicle.actor;
    } else {
        newActor = newVehicle;
    }

    await newActor.sheet.linkCrew(actor.uuid);
}

export async function removeFromCrew(actor: any, vehicleID: any): Promise<void> {
    if (actor.getFlag('od6s', 'crew') !== vehicleID) {
        ui.notifications.warn(game.i18n.localize('OD6S.NOT_CREW_MEMBER'))
    } else {
        try {
            await actor.unsetFlag('od6s', 'crew');
        } catch (error) {
            console.error(error)
        }
    }
}

export async function forceRemoveCrewmember(actor: any, crewID: any): Promise<void> {
    const crewMembers = actor.system.crewmembers.filter((e: any) => e.uuid !== crewID);
    const update: any = {};
    update.system = {};
    update.system.crewmembers = crewMembers;
    await actor.update(update);
}

export function isCrewMember(actor: any): any {
    return actor.getFlag('od6s', 'crew');
}

export async function sendVehicleData(actor: any, uuid: any): Promise<void> {
    const data: any = {};
    data.uuid = actor.uuid;
    data.name = actor.name;
    data.type = actor.type;
    data.move = actor.system.move;
    data.maneuverability = actor.system.maneuverability;
    data.toughness = actor.system.toughness;
    data.crewmembers = actor.system.crewmembers;
    data.items = actor.items;
    data.attribute = actor.system.attribute;
    data.skill = actor.system.skill;
    data.specialization = actor.system.specialization;
    data.damage = actor.system.damage;
    data.shields = actor.system.shields;
    data.scale = actor.system.scale;
    data.sensors = actor.system.sensors;
    data.armor = actor.system.armor;
    data.dodge = actor.system.dodge;
    data.ranged = actor.system.ranged;
    data.ranged_damage = actor.system.ranged_damage;
    data.ram = actor.system.ram;
    data.ram_damage = actor.system.ram_damage;
    data.vehicle_weapons = [];
    for (let i = 0; i < data.items.size; i++) {
        if (actor.items.contents[i].type === "vehicle-weapon" || actor.items.contents[i].type === "starship-weapon") {
            const newItem = actor.items.contents[i].toObject()
            newItem.id = actor.items.contents[i].id;
            data.vehicle_weapons.push(newItem);
        }
    }

    if (game.user.isGM) {
        let crew;
        if(typeof uuid !== 'undefined') {
            crew = data.crewmembers.filter((c: any) =>c.uuid === uuid);
        } else {
            crew = data.crewmembers;
        }

        for (const e of crew) {
            const crewActor = await od6sutilities.getActorFromUuid(e.uuid);
            if (crewActor) {
                const update: any = {};
                update.id = crewActor.id;
                update._id = crewActor.id;
                update.system = {}
                update.system.vehicle = data;
                await crewActor.update(update);
            }
        }
    } else {
        await OD6S.socket.executeAsGM("sendVehicleData", data);
    }
}

export async function modifyShields(actor: any, update: any): Promise<void> {
    await OD6S.socket.executeAsGM("modifyShields", update);
}

export async function vehicleCollision(actor: any): Promise<void> {
    if (actor.type !== 'vehicle' && actor.type !== 'starship') {
        ui.notifications.warn(game.i18n.localize('OD6S.WARN_ACTOR_NOT_VEHICLE'));
        return;
    }
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/od6s/templates/actor/vehicle/collision.html");
    const result = await foundry.applications.api.DialogV2.input({
        window: {title: game.i18n.localize("OD6S.ROLL_COLLISION_DAMAGE")},
        content,
        ok: {label: game.i18n.localize("OD6S.ROLL")},
    });
    if (!result) return;

    await rollVehicleCollision(actor, result);
}

async function rollVehicleCollision(actor: any, result: any): Promise<void> {
    const speed = result.vehiclespeed;
    const speedValue = OD6S.vehicle_speeds[speed].damage;
    const type = result.vehiclecollisiontype;
    const typeValue = OD6S.collision_types[type].score;
    const mod = result.vehiclecollisionmod ?? 0;
    const score = (+speedValue) + (+typeValue) + (+mod * OD6S.pipsPerDice);
    const dice = od6sutilities.getDiceFromScore(score);
    let rollString;
    if (game.settings.get("od6s", "use_wild_die")) {
        dice.dice = dice.dice - 1;
        if (dice.dice < 1) {
            rollString = "+1dw" + game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
        } else {
            rollString = dice.dice + "d6" + game.i18n.localize("OD6S.BASE_DIE_FLAVOR") + "+1dw"
                + game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
        }
    } else {
        rollString = dice.dice + "d6" + game.i18n.localize("OD6S.BASE_DIE_FLAVOR");
    }
    if (dice.pips) rollString += "+" + dice.pips;

    const roll = await new Roll(rollString).evaluate();
    const label = game.i18n.localize("OD6S.DAMAGE") + " ("
        + game.i18n.localize(OD6S.damageTypes["p"]) + ") "
        + game.i18n.localize("OD6S.FROM") + " " + game.i18n.localize("OD6S.COLLISION");

    const flags: any = {
        type: "damage",
        source: game.i18n.localize("OD6S.COLLISION"),
        damageType: "p",
        targetName: null,
        targetId: null,
        isOpposable: true,
        wild: false,
        wildHandled: false,
        wildResult: OD6S.wildDieResult[OD6S.wildDieOneDefault],
        total: roll.total,
        isVehicleCollision: true,
    };

    if (game.settings.get("od6s", "use_wild_die")) {
        const wildFlavor = game.i18n.localize("OD6S.WILD_DIE_FLAVOR").replace(/[[\]]/g, "");
        const wildTerm = (roll.terms as any[]).find((d: any) => d.flavor === wildFlavor);
        if (wildTerm?.total === 1) {
            flags.wild = true;
            if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) flags.wildHandled = true;
        }
    }

    let rollMode: any = "roll";
    if (game.user.isGM && game.settings.get("od6s", "hide-gm-rolls")) {
        rollMode = (CONST as any).DICE_ROLL_MODES.PRIVATE;
    }

    const rollMessage = await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: (game as any).actors.find((a: any) => a.id === actor.id)}),
        flavor: label,
        flags: {od6s: flags},
        rollMode,
        create: true,
    });

    if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
        const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
        let highest = 0;
        for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
            if (replacementRoll.terms[0].results[i].result > replacementRoll.terms[0].results[highest].result) {
                highest = i;
            }
        }
        replacementRoll.terms[0].results[highest].discarded = true;
        replacementRoll.terms[0].results[highest].active = false;
        replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result) + 1;
        flags.total = replacementRoll.total;

        if (rollMessage.getFlag("od6s", "difficulty") && rollMessage.getFlag("od6s", "success")) {
            await rollMessage.setFlag("od6s", "success",
                replacementRoll.total >= rollMessage.getFlag("od6s", "difficulty"));
        }

        await rollMessage.setFlag("od6s", "originalroll", rollMessage.rolls?.[0]);
        await rollMessage.update({
            id: rollMessage.id,
            _id: rollMessage._id,
            content: replacementRoll.total,
            roll: replacementRoll,
            system: {},
        }, {diff: true});
    }
}

export async function onCargoHoldItemCreate(actor: any, event: any): Promise<any> {
    event.preventDefault();

    const documentName = 'Item';
    let types = game.documentTypes[documentName].filter(t => t !== CONST.BASE_DOCUMENT_TYPE);
    const data: any = {};
    const foldersCollection = game.folders.filter(f => (f.type === documentName) && f.displayed);
    const folders = foldersCollection.map(f => ({id: f.id, name: f.name}));
    const label = game.i18n.localize('OD6S.ITEM');
    const title = game.i18n.format("OD6S.CREATE_ITEM", {entity: label});
    const template = 'templates/sidebar/document-create.html';

    if (game.settings.get('od6s', 'hide_advantages_disadvantages')) {
        types = types.filter(function (value, _index, _arr) {
            return value !== 'advantage';
        })
        types = types.filter(function (value, _index, _arr) {
            return value !== 'disadvantage';
        })
    }

    types = types.filter(t => OD6S.cargo_hold.includes(t));
    types = types.filter(t => !t.startsWith(actor.type));

    types = types.sort(function (a, b) {
        return a.localeCompare(b);
    })

    // Render the entity creation form
    const html = await renderTemplate(template, {
        name: data.name || game.i18n.format("OD6S.NEW_ITEM", {entity: label}),
        folder: data.folder,
        folders: folders,
        hasFolders: folders.length > 0,
        type: data.type || types[0],
        types: types.reduce((obj, t) => {
            const label = CONFIG[documentName]?.typeLabels?.[t] ?? t;
            (obj as any)[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
            return obj;
        }, {}),
        hasTypes: types.length > 1
    });

    // Render the confirmation dialog window
    return Dialog.prompt({
        title: title,
        content: html,
        label: title,
        callback: html => {
            const form = html[0].querySelector("form");
            const fd = new FormDataExtended(form);
            foundry.utils.mergeObject(data, fd.object);
            if (!data.folder) delete data["folder"];
            if (types.length === 1) data.type = types[0];
            data.name = data.name || game.i18n.localize('OD6S.NEW') + " " + game.i18n.localize(OD6S.itemLabels[data.type]);
            return actor.createEmbeddedDocuments('Item', [data]);
        },
        rejectClose: false
    });
}
