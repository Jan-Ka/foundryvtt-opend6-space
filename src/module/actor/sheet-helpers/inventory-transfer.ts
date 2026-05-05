/**
 * Cross-actor item moves invoked from the actor sheet:
 *
 *   - `onPurchase` — fires after a purchase roll succeeds (called from
 *     `roll-execute`, `chat-log-listeners`, `handle-wild-die`, and the
 *     inventory listener for the cost=0 / `OD6S.cost === '0'` shortcut).
 *     Deducts credits when the credit-check setting is on, then copies the
 *     item from seller to buyer (stacking gear by name) and decrements the
 *     seller's quantity.
 *
 *   - `onTransfer` — straight item move between two actors. Same gear-
 *     stacking rule as `onPurchase`; for non-gear types the source doc
 *     is deleted after the receiver is given a copy. Also auto-cleans
 *     zero-quantity gear off character/container sources.
 */

import OD6S from "../../config/config-od6s";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sheet = any;

export async function onPurchase(sheet: Sheet, itemId: any, buyerId: any): Promise<void> {
    const seller = sheet.document;
    const buyer = (game as any).actors.get(buyerId);
    const item = seller.items.get(itemId);

    if (OD6S.cost === "1") {
        if ((+buyer!.system.credits.value) < (+item!.system.cost)) {
            ui.notifications.warn(game.i18n.localize("OD6S.WARN_NOT_ENOUGH_CURRENCY"));
            return;
        }
        await buyer!.update({"system.credits.value": (+buyer!.system.credits.value) - (+item!.system.cost)});
    }

    const boughtItem = JSON.parse(JSON.stringify(item));
    boughtItem.system.quantity = 1;
    if (item!.type === "gear") {
        const hasItem = buyer!.items.filter((i: any) => i.name === item!.name);
        if (hasItem.length > 0) {
            await hasItem[0].update({"system.quantity": (+hasItem[0].system.quantity) + 1});
        } else {
            await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
        }
    } else {
        await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
    }

    const sellerUpdate: any = {};
    if (item!.system.quantity > 0) sellerUpdate["system.quantity"] = (+item!.system.quantity) - 1;
    await item!.update(sellerUpdate);
}

export async function onTransfer(sheet: Sheet, itemId: any, senderId: any, recId: any): Promise<void> {
    const sender = (game as any).actors.get(senderId);
    const receiver = (game as any).actors.get(recId);
    const item = sender!.items.get(itemId);

    const recItem = JSON.parse(JSON.stringify(item));
    recItem.quantity = 1;
    if (item!.type === "gear") {
        const hasItem = receiver!.items.filter((i: any) => i.name === item!.name);
        if (hasItem.length > 0) {
            await hasItem[0].update({"system.quantity": (+hasItem[0].system.quantity) + 1});
        } else {
            await receiver!.createEmbeddedDocuments("Item", [recItem]);
        }

        const senderUpdate: any = {};
        if (item!.system.quantity > 0) senderUpdate["system.quantity"] = (+item!.system.quantity) - 1;
        await item!.update(senderUpdate);

        if ((sender!.type === "character" || sender!.type === "container")
            && item!.system.quantity === 0) {
            await sender!.deleteEmbeddedDocuments("Item", [item!.id]);
        }
    } else {
        await receiver!.createEmbeddedDocuments("Item", [recItem]);
        await sender!.deleteEmbeddedDocuments("Item", [item!.id]);
    }

    await sheet.render();
}
