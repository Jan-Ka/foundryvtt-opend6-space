/**
 * Cross-actor item moves invoked from the actor sheet:
 *
 *   - `onPurchase` — finalize a purchase. Two entry paths:
 *     1. After a purchase roll resolves: chat-card / wild-die / difficulty-
 *        edit handlers call `seller.sheet._onPurchase(...)` to commit the
 *        sale (this is the path used when `OD6S.cost === '0'`, i.e. the
 *        funds-based purchase-by-roll system).
 *     2. Direct purchase without a roll: the inventory listener calls
 *        `_onPurchase` immediately when `OD6S.cost !== '0'` (credit-based
 *        system; `OD6S.cost === '1'` additionally deducts buyer credits).
 *     Either way, the helper copies the item from seller to buyer
 *     (stacking same-name gear) and decrements the seller's quantity.
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

    // The post-roll entry paths (chat-card, wild-die, difficulty-edit) can
    // resolve much later than the roll itself; the seller may have removed
    // the stock between roll and resolve. Fail with the same not-found
    // warning `rollPurchase` uses rather than crashing on the next deref.
    if (typeof item === "undefined") {
        ui.notifications.warn(game.i18n.localize("OD6S.ITEM_NOT_FOUND"));
        return;
    }

    if (OD6S.cost === "1") {
        if ((+buyer!.system.credits.value) < (+item.system.cost)) {
            ui.notifications.warn(game.i18n.localize("OD6S.WARN_NOT_ENOUGH_CURRENCY"));
            return;
        }
        await buyer!.update({"system.credits.value": (+buyer!.system.credits.value) - (+item.system.cost)});
    }

    const boughtItem = JSON.parse(JSON.stringify(item));
    boughtItem.system.quantity = 1;
    if (item.type === "gear") {
        // Gear-only merge: the legacy code matched by name alone, which
        // would silently bump a non-gear (weapon/armor) of the same name
        // already on the buyer. Restrict the match to gear so cross-type
        // collisions create a fresh document instead.
        const hasItem = buyer!.items.filter((i: any) => i.type === "gear" && i.name === item.name);
        if (hasItem.length > 0) {
            await hasItem[0].update({"system.quantity": (+hasItem[0].system.quantity) + 1});
        } else {
            await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
        }
    } else {
        await buyer!.createEmbeddedDocuments("Item", [boughtItem]);
    }

    const sellerUpdate: any = {};
    if (item.system.quantity > 0) sellerUpdate["system.quantity"] = (+item.system.quantity) - 1;
    await item.update(sellerUpdate);
}

export async function onTransfer(sheet: Sheet, itemId: any, senderId: any, recId: any): Promise<void> {
    const sender = (game as any).actors.get(senderId);
    const receiver = (game as any).actors.get(recId);
    const item = sender!.items.get(itemId);

    const recItem = JSON.parse(JSON.stringify(item));
    // Schema stores quantity under `system`, not at the top level. The
    // legacy `recItem.quantity = 1` set a stray top-level field while
    // the inner `system.quantity` retained whatever the sender had —
    // transferring a stack would create the full original count on the
    // receiver instead of a single unit. Match `onPurchase`'s pattern.
    recItem.system.quantity = 1;
    if (item!.type === "gear") {
        // Gear-only merge — same cross-type collision rationale as in
        // `onPurchase`.
        const hasItem = receiver!.items.filter((i: any) => i.type === "gear" && i.name === item!.name);
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
