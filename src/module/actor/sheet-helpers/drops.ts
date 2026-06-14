import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {onDropCharacterTemplate, onDropItemGroup, onDropSpeciesTemplate} from "./templates";
import {
    isCharacterTemplateItem,
    isItemGroupItem,
    isSkillItem,
    isSpecializationItem,
    isSpeciesTemplateItem,
} from "../../system/type-guards";

/**
 * Minimal sheet shape consumed by the drop helpers. Avoiding `OD6SActorSheet`
 * here breaks the actor-sheet ↔ helpers import cycle.
 */
interface DropSheetLike {
    document: Actor;
    render: () => unknown;
    linkCrew: (uuid: string) => Promise<unknown>;
    _isEquippable: (type: string) => boolean;
    _createAction: (data: {
        name: string; type?: string; subtype: string; rollable?: boolean | string; itemId?: string
    }) => Promise<unknown>;
    _onSortItem: (event: DragEvent, data: { _id: string; [key: string]: unknown }) => unknown;
    _onSortCrew: (event: DragEvent, data: { crewUuid: string }) => unknown;
    _onSortCargoItem: (event: DragEvent, data: { _id: string; [key: string]: unknown }) => unknown;
    _onSortContainerItem: (event: DragEvent, data: { _id: string; [key: string]: unknown }) => unknown;
}

/** Drop payload returned by the drag-drop layer; type/uuid plus arbitrary extras. */
type DropData = Record<string, unknown> & {
    type?: string;
    uuid?: string;
    actorId?: string;
    sceneId?: string;
    tokenId?: string;
    itemId?: string;
    _id?: string;
};

/**
 * Override for the _onDrop handler.
 */
export async function onDrop(sheet: DropSheetLike, event: DragEvent | { preventDefault: () => unknown; dataTransfer: { getData: (k: string) => string }; target?: unknown; currentTarget?: unknown }) {
    event.preventDefault();
    // Try to extract the data

    let data: DropData;
    try {
        data = JSON.parse(event.dataTransfer!.getData('text/plain')) as DropData;
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
            return onDropActiveEffect(sheet, event as Event, data);
        case "Actor":
            return onDropActor(sheet, event as Event, data);
        case "Item": {
            const item = await Item.fromDropData(data);
            switch (item.type) {
                case "character-template":
                    if (isCharacterTemplateItem(item)) return onDropCharacterTemplate(sheet, event as Event, item, data);
                    return;
                case "item-group":
                    if (isItemGroupItem(item)) return onDropItemGroup(sheet, event as Event, item, data);
                    return;
                case "species-template":
                    if (isSpeciesTemplateItem(item)) return onDropSpeciesTemplate(sheet, event as Event, item, data);
                    return;
                case "skill": {
                    if (!isSkillItem(item)) return;
                    const sys = item.system;
                    if (typeof (sys.attribute) === 'undefined' || sys.attribute === '') {
                        ui.notifications.error(game.i18n.localize('NONEX_IST_OD6S.MISSING_ATTRIBUTE'))
                        return;
                    } else {
                        return onDropItem(sheet, event as DragEvent, data);
                    }
                }
                case "specialization": {
                    if (!isSpecializationItem(item)) return;
                    const sys = item.system;
                    if (typeof (sys.attribute) === 'undefined' || sys.attribute === '') {
                        ui.notifications.error(game.i18n.localize('NONEX_IST_OD6S.MISSING_ATTRIBUTE'))
                        return;
                    } else if (typeof (sys.skill) === 'undefined' || sys.skill === '') {
                        ui.notifications.error(game.i18n.localize('NONEX_IST_OD6S.MISSING_SKILL'))
                        return;
                    } else if (!(actor.items.find((i: Item) => i.type === 'skill' && i.name === sys.skill))) {
                        ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.DOES_NOT_POSSESS_SKILL'));
                        return;
                    } else {
                        return onDropItem(sheet, event as DragEvent, data);
                    }
                }
                default:
                    return onDropItem(sheet, event as DragEvent, data);
            }
        }
        case "Folder":
            return onDropFolder(sheet, event as DragEvent, data);
        case "availableaction":
            return await sheet._createAction(data as unknown as Parameters<typeof sheet._createAction>[0]);
        case "assignedaction":
            data.type = "action";
            data._id = data.itemId;
            return await sheet._onSortItem(event as DragEvent, data as { _id: string; [k: string]: unknown });
        case "crewmember":
            return await sheet._onSortCrew(event as DragEvent, data as { crewUuid: string });
    }
    sheet.render();
    return undefined;
}

/**
 * Override for the _onDropItem handler.
 */
export async function onDropItem(sheet: DropSheetLike, event: DragEvent, data: DropData) {
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
            (itemData.effects as Array<{ disabled?: boolean; transfer?: boolean }>).forEach((i) => {
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
            (itemData.effects as Array<{ disabled?: boolean; transfer?: boolean }>).forEach((i) => {
                i.disabled = true;
                i.transfer = false;
            })
        }
    }

    // Handle item sorting within the same Actor
    if (item.parent !== null && data.uuid!.startsWith(item.parent.uuid)) {
        if ((sheet.document.type === 'starship' || sheet.document.type === 'vehicle') &&
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
        if (typeof (data.actorId) !== 'undefined' && data.actorId !== null && data.actorId !== '') {
            if (typeof (data.tokenId) !== 'undefined' && data.tokenId !== null && data.tokenId !== '') {
                const scene = game.scenes.get(data.sceneId!);
                // @ts-expect-error - synthetic .object on TokenDocument set by canvas
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
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.WARN_NOT_DELETING_ITEM_OWNER'));
            }
        } else {
            await sheet.document.createEmbeddedDocuments("Item", [itemData]);
        }
    }
    sheet.render();
    return undefined;
}

/**
 * Override for the _onDropActor handler.
 */
export async function onDropActor(sheet: DropSheetLike, _event: Event, data: DropData) {
    if (!sheet.document.isOwner) return false;

    if (sheet.document.type === "vehicle" || sheet.document.type === "starship") {
        if ((sheet.document.system as { embedded_pilot: { value: boolean } }).embedded_pilot.value) {
            let pilotActor: Actor | undefined;
            if (data.uuid!.startsWith('Compendium')) {
                pilotActor = await fromUuid(data.uuid!);
            } else {
                pilotActor = await od6sutilities.getActorFromUuid(data.uuid!);
            }
            if (typeof (pilotActor) === 'undefined') {
                ui.notifications.warn(game.i18n.localize('NONEX_IST_OD6S.ACTOR_NOT_FOUND'));
                return false;
            }

            await (sheet.document as Actor & { addEmbeddedPilot: (a: Actor) => Promise<unknown> })
                .addEmbeddedPilot(pilotActor);
        } else {
            await sheet.linkCrew(data.uuid!);
        }
    }
    return undefined;
}

/**
 * Drop an ActiveEffect onto the actor sheet. V1 ActorSheet provided
 * `_onDropActiveEffect`; ActorSheetV2 does not, so the prior call site
 * threw TypeError and the drop silently failed (#71).
 */
export async function onDropActiveEffect(sheet: DropSheetLike, _event: Event, data: DropData) {
    if (!sheet.document.isOwner) return false;
    const effect = await ActiveEffect.implementation.fromDropData(data);
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
export async function onDropFolder(sheet: DropSheetLike, event: DragEvent, data: DropData) {
    if (!sheet.document.isOwner) return false;
    const folder = await Folder.implementation.fromDropData(data);
    if (!folder || folder.type !== "Item") return false;

    // Folder.children is an array of {folder, depth, root} wrappers in
    // v14 client side; .contents is the immediate documents.
    const collected: FoundryDocument[] = [];
    const walk = (f: Folder) => {
        for (const doc of f.contents ?? []) collected.push(doc);
        for (const child of f.children ?? []) {
            const sub = (child as { folder?: Folder }).folder ?? (child as Folder);
            walk(sub);
        }
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
