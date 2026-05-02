import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {onDropCharacterTemplate, onDropItemGroup, onDropSpeciesTemplate} from "./templates";

/**
 * Override for the _onDrop handler.
 */
export async function onDrop(sheet: any, event: any) {
    event.preventDefault();
    // Try to extract the data

    let data;
    try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
        return false;
    }

    const actor = sheet.document;
    // Handle the drop with a Hooked function
    const allowed = Hooks.call("dropActorSheetData", actor, sheet, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
        case "ActiveEffect":
            return onDropActiveEffect(sheet, event, data);
        case "Actor":
            return onDropActor(sheet, event, data);
        case "Item": {
            const item = await Item.fromDropData(data);
            switch (item.type) {
                case "character-template":
                    return onDropCharacterTemplate(sheet, event, item, data);
                case "item-group":
                    return onDropItemGroup(sheet, event, item, data);
                case "species-template":
                    return onDropSpeciesTemplate(sheet, event, item, data);
                case "skill": {
                    const sys = item.system as OD6SSkillItemSystem;
                    if (typeof (sys.attribute) === 'undefined' || sys.attribute === '') {
                        ui.notifications.error(game.i18n.localize('OD6S.MISSING_ATTRIBUTE'))
                        return;
                    } else {
                        return onDropItem(sheet, event, data);
                    }
                }
                case "specialization": {
                    const sys = item.system as OD6SSpecializationItemSystem;
                    if (typeof (sys.attribute) === 'undefined' || sys.attribute === '') {
                        ui.notifications.error(game.i18n.localize('OD6S.MISSING_ATTRIBUTE'))
                        return;
                    } else if (typeof (sys.attribute) === 'undefined' || sys.skill === '') {
                        ui.notifications.error(game.i18n.localize('OD6S.MISSING_SKILL'))
                        return;
                    } else if (!(actor.items.find((i: any) => i.type === 'specialization' && i.name === item.name))) {
                        ui.notifications.warn(game.i18n.localize('OD6S.DOES_NOT_POSSESS_SKILL'));
                        return;
                    } else {
                        return onDropItem(sheet, event, data);
                    }
                }
                default:
                    return onDropItem(sheet, event, data);
            }
        }
        case "Folder":
            return onDropFolder(sheet, event, data);
        case "availableaction":
            return await sheet._createAction(data);
        case "assignedaction":
            data.type = "action";
            data._id = data.itemId;
            return await sheet._onSortItem(event, data);
        case "crewmember":
            return await sheet._onSortCrew(event, data);
    }
    sheet.render();
}

/**
 * Override for the _onDropItem handler.
 */
export async function onDropItem(sheet: any, event: any, data: any) {
    if (!sheet.document.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // Verify the actor can have the item type
    if (sheet.document.type !== 'starship' && sheet.document.type !== 'vehicle') {
        if (!OD6S.allowedItemTypes[sheet.document.type].includes(itemData.type)) {
            return false;
        }
    }

    //Set any active effects on characters to disabled until the item is equipped unless the item is a cybernetic
    if (sheet.document.type === 'character') {
        if (itemData.type !== 'cybernetic' &&
            itemData.type !== 'advantage' &&
            itemData.type !== 'disadvantage' &&
            itemData.type !== 'specialability') {
            itemData.effects.forEach((i: any) => {
                i.disabled = true;
            })
        }
    } else if (sheet.document.type === 'container') {
        if (sheet._isEquippable(itemData.type)) {
            itemData.system.equipped.value = false;
        }
    } else {
        // Do not equip cargo hold items
        if (OD6S.allowedItemTypes[sheet.document.type].includes(itemData.type)) {
            if (sheet._isEquippable(itemData.type)) {
                itemData.system.equipped.value = true;
            }
        } else {
            if (sheet._isEquippable(itemData.type)) {
                itemData.system.equipped.value = false;
            }
            itemData.effects.forEach((i: any) => {
                i.disabled = true;
                i.transfer = false;
            })
        }
    }

    // Handle item sorting within the same Actor
    if (item.parent !== null && data.uuid.startsWith(item.parent.uuid)) {
        if (sheet.document.type === 'starship' || sheet.document.type === 'vehicle' &&
            !OD6S.allowedItemTypes[sheet.document.type].includes(itemData.type)) {
            await sheet._onSortItem(event, itemData);
            await sheet._onSortCargoItem(event, itemData);
        } else if (sheet.document.type === 'container') {
            await sheet._onSortContainerItem(event, itemData);
        } else {
            await sheet._onSortItem(event, itemData);
        }
    } else {
        // Could be dragging from sheet to sheet
        let sourceActor;
        if (typeof (data.actorId) !== 'undefined' && data.actorId !== null && data.actor !== '') {
            if (typeof (data.tokenId) !== 'undefined' && data.tokenId !== null && data.tokenId !== '') {
                const scene = game.scenes.get(data.sceneId);
                // @ts-expect-error
                sourceActor = scene!.tokens.get(data.tokenId).object.actor;
            } else {
                sourceActor = game.actors.get(data.actorId);
            }
            if (game.user.isGM || sourceActor!.isOwner) {
                // V1 ActorSheet provided _onDropItemCreate; V2 does not.
                // Inline the equivalent createEmbeddedDocuments call.
                const created = await sheet.document.createEmbeddedDocuments("Item", [itemData]);
                if (created?.length) {
                    await sourceActor!.deleteEmbeddedDocuments('Item', [item.id]);
                }
            } else {
                ui.notifications.warn('OD6S.WARN_NOT_DELETING_ITEM_OWNER');
            }
        } else {
            await sheet.document.createEmbeddedDocuments("Item", [itemData]);
        }
    }
    sheet.render();
}

/**
 * Override for the _onDropActor handler.
 */
export async function onDropActor(sheet: any, event: any, data: any) {
    if (!sheet.document.isOwner) return false;

    if (sheet.document.type === "vehicle" || sheet.document.type === "starship") {
        if (sheet.document.system.embedded_pilot.value) {
            let pilotActor: Actor | undefined;
            if (data.uuid.startsWith('Compendium')) {
                pilotActor = await fromUuid(data.uuid);
            } else {
                pilotActor = await od6sutilities.getActorFromUuid(data.uuid);
            }
            if (typeof (pilotActor) === 'undefined') {
                ui.notifications.warn(game.i18n.localize('OD6S.ACTOR_NOT_FOUND'));
                return false;
            }

            await sheet.document.addEmbeddedPilot(pilotActor);
        } else {
            await sheet.linkCrew(data.uuid);
        }
    }
}

/**
 * Drop an ActiveEffect onto the actor sheet. V1 ActorSheet provided
 * `_onDropActiveEffect`; ActorSheetV2 does not, so the prior call site
 * threw TypeError and the drop silently failed (#71).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onDropActiveEffect(sheet: any, _event: any, data: any) {
    if (!sheet.document.isOwner) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const effect = await (ActiveEffect as any).implementation.fromDropData(data);
    if (!effect) return false;
    // Don't re-create an effect that's already on this actor.
    if (effect.target === sheet.document) return false;
    return sheet.document.createEmbeddedDocuments("ActiveEffect", [effect.toObject()]);
}

/**
 * Drop a Folder of Items onto the actor sheet. V1 ActorSheet provided
 * `_onDropFolder`; ActorSheetV2 does not (#71). Walk the folder
 * (including subfolders), then re-dispatch each item through the
 * existing onDrop pipeline so per-item type dispatch
 * (character-template / species-template / item-group / skill /
 * specialization guards) AND the onDropItem normalization (equip
 * flags, effect transfer disabling, container repacks) all apply
 * exactly as they would for an individual drop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onDropFolder(sheet: any, event: any, data: any) {
    if (!sheet.document.isOwner) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const folder = await (Folder as any).implementation.fromDropData(data);
    if (!folder || folder.type !== "Item") return false;

    // Folder.children is an array of {folder, depth, root} wrappers in
    // v14 client side; .contents is the immediate documents.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collected: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (f: any) => {
        for (const doc of f.contents ?? []) collected.push(doc);
        for (const child of f.children ?? []) walk(child.folder ?? child);
    };
    walk(folder);

    if (!collected.length) return false;

    // Re-enter onDrop per item. The drop event's coordinates aren't
    // meaningful for batch creation, so reuse the original event but
    // swap in synthesized dataTransfer for each item — onDrop reads
    // text/plain off the event.
     
    const results: unknown[] = [];
    for (const doc of collected) {
        const itemDropData = {type: "Item", uuid: doc.uuid};
        const synthEvent = {
            preventDefault: () => undefined,
            dataTransfer: {
                getData: (key: string) =>
                    key === "text/plain" ? JSON.stringify(itemDropData) : "",
            },
            // Carry positional info from the original event for any
            // sort-target logic in onDropItem.
            target: event?.target,
            currentTarget: event?.currentTarget,
            clientX: event?.clientX,
            clientY: event?.clientY,
        };
        const r = await onDrop(sheet, synthEvent);
        if (r) results.push(r);
    }
    return results;
}
