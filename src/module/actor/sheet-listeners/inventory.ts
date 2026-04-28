import OD6SItemInfo from "../../apps/item-info";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Register inventory-related event listeners on the actor sheet.
 */
export function registerInventoryListeners(html: any, sheet: any): void {
    const el = html[0];

    // Edit item quantity
    el.querySelectorAll('.edit-quantity').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const item = await sheet.document.items.get(ev.currentTarget.dataset.itemId);
            const update = {};
            (update as any)[`system.quantity`] = ev.target.value
            await item!.update(update);
        }));

    // Use a consumable
    el.querySelectorAll('.use-consumable').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            const item = await sheet.document.items.get(ev.currentTarget.dataset.itemId);
            const update: any = {};
            update.id = item!._id;
            update[`system.quantity`] = item!.system.quantity - 1;
            await item!.update(update);

            const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

            if (actorEffectsList.size > 0) {
                const actorUpdate: any[] = [];
                actorEffectsList.forEach((e: any) => {
                    const parts = e.origin?.split(".") ?? [];
                    const parentType = parts[0];
                    let documentType = parts[2];
                    let documentId = parts[3];
                    if (parentType === "Scene") {
                        documentType = parts[4];
                        documentId = parts[5];
                    }
                    if (documentType === "Item") {
                        const effectItem = sheet.document.items.find((i: any) => i.id === documentId);
                        if (effectItem) {
                            if (e.disabled === true) {
                                const effectUpdate: any = {};
                                effectUpdate._id = e.id;
                                effectUpdate.disabled = false;
                                actorUpdate.push(effectUpdate);
                            }
                        }
                    }
                })
                await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
            }
        }));

    // Equip an item
    el.querySelectorAll('.equip-checkbox').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const item = sheet.document.items.find((i: any) => i.id === ev.currentTarget.dataset.itemId);

            if (item) {
                const update: any = {};
                update.id = item.id;
                update['system.equipped.value'] = !item.system.equipped.value;

                await item.update(update);
                const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

                if (actorEffectsList.size > 0) {
                    const actorUpdate: any[] = [];
                    const itemUpdates: any[] = [];
                    actorEffectsList.forEach((e: any) => {
                        const parts = e.origin?.split(".") ?? [];
                        const parentType = parts[0];
                        let documentType = parts[2];
                        let documentId = parts[3];
                        if (parentType === "Scene") {
                            documentType = parts[4];
                            documentId = parts[5];
                        }
                        if (documentType === "Item") {
                            const effectItem = sheet.document.items.find((i: any) => i.id === documentId);
                            if (effectItem && !effectItem.system.consumable &&
                                OD6S.equippable.includes(effectItem.type)) {
                                if (e.disabled === effectItem.system.equipped.value) {
                                    if (!effectItem.system.equipped.value) {
                                        for (let i = 0; i < e.changes.length; i++) {
                                            const c = e.changes[i];
                                            if (c.key.startsWith('system.items.skills')) {
                                                if (c.mode === 2) {
                                                    const t = c.key.split('.');
                                                    const foundItem = sheet.document.items.find((i: any) => i.name === t[3]);
                                                    const itemUpdate: any = {};
                                                    itemUpdate.id = foundItem!.id;
                                                    itemUpdate.system = {};
                                                    itemUpdate.system.mod = 0;
                                                    itemUpdates.push(itemUpdate);
                                                }
                                            }
                                        }
                                    }
                                    const effectUpdate: any = {};
                                    effectUpdate._id = e.id;
                                    effectUpdate.disabled = !item.system.equipped.value;
                                    actorUpdate.push(effectUpdate);
                                }
                            }
                        }
                    })
                    await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
                    for (let u = 0; u < itemUpdates.length; u++) {
                        const a = sheet.document.items.find((i: any) => i.id === itemUpdates[u].id);
                        await a!.update(itemUpdates[u]);
                    }
                }
            }
            sheet.render();
        }));

    // Update Inventory Item
    el.querySelectorAll('.item-edit').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            let itemId;
            if (typeof (ev.currentTarget.dataset.itemId) !== 'undefined' &&
                ev.currentTarget.dataset.itemId !== '') {
                itemId = ev.currentTarget.dataset.itemId
            } else {
                const li = ev.currentTarget.closest(".item");
                itemId = li?.dataset?.itemId;
            }
            const item = sheet.document.items.get(itemId);
            item!.sheet.render(true);
        }));

    // Delete Inventory Item
    el.querySelectorAll('.item-delete').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            await sheet.deleteItem(ev);
        }));

    // Add Inventory Item
    el.querySelectorAll('.item-create').forEach((elem: any) =>
        elem.addEventListener('click', sheet._onItemCreate.bind(sheet)));
    el.querySelectorAll('.cargo-hold-add').forEach((elem: any) =>
        elem.addEventListener('click', (sheet.document as any).onCargoHoldItemCreate.bind(sheet.document)));

    // Add Item to actor using a button
    el.querySelectorAll('.item-add').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            await sheet.addItem(ev);
        }));

    // Show item details
    el.querySelectorAll('.show-item-details').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            let item = game!.actors.get(ev.currentTarget.dataset.actorId)?.items.get(ev.currentTarget.dataset.itemId);
            if (typeof (item) !== 'undefined') {
                new OD6SItemInfo(item).render(true);
            } else {
                const itemName = ev.currentTarget.dataset.itemName;
                item = await od6sutilities._getItemFromWorld(itemName);
                if (item) {
                    new OD6SItemInfo(item.data).render(true);
                } else {
                    // Check compendia
                    const compItem = await od6sutilities._getItemFromCompendium(itemName);
                    if (compItem) {
                        new OD6SItemInfo(compItem.data).render(true);
                    }
                }
            }
        }));

    // Purchase click event
    el.querySelectorAll('.item-purchase').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            if (typeof (game.user.character) === 'undefined') {
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_NO_CHARACTER_ASSIGNED'));
                return;
            }
            if (OD6S.cost === '0') {
                await sheet.rollPurchase(ev, game!.user.character!.id);
            } else {
                await sheet._onPurchase(ev.currentTarget.dataset.itemId, game!.user.character!.id);
            }
        }));

    // Transfer click event
    el.querySelectorAll('.item-transfer').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            if (typeof (game.user.character) === 'undefined') {
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_NO_CHARACTER_ASSIGNED'));
                return;
            }
            await sheet._onTransfer(ev.currentTarget.dataset.itemId,
                ev.currentTarget.dataset.senderId,
                ev.currentTarget.dataset.recId);
        }));

    // Merchant owner edit quantity
    el.querySelectorAll('.merchant-quantity-owner').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const item = sheet.document.items.get(ev.currentTarget.dataset.itemId);
            const update: any = {};
            update._id = item!.id;
            update.system = {};
            update.system.quantity = ev.target.value;

            await sheet.document.updateEmbeddedDocuments('Item', [update]);
        }));

    // Merchant owner edit cost
    el.querySelectorAll('.merchant-cost-owner').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const item = sheet.document.items.get(ev.currentTarget.dataset.itemId);
            const update: any = {};
            update._id = item!.id;
            update.system = {};
            update.system.cost = ev.target.value;

            await sheet.document.updateEmbeddedDocuments('Item', [update]);
        }));

    // Merchant owner edit price
    el.querySelectorAll('.merchant-price-owner').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const item = sheet.document.items.get(ev.currentTarget.dataset.itemId);
            const update: any = {};
            update._id = item!.id;
            update.system = {};
            update.system.price = ev.target.value;

            await sheet.document.updateEmbeddedDocuments('Item', [update]);
        }));
}
