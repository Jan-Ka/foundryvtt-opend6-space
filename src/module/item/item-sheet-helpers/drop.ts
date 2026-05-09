/**
 * Drag-drop handlers for the item sheet.
 * Extracted from item-sheet.ts; behaviour preserved.
 */

import {isWeaponItem} from "../../system/type-guards";
import {addTemplateItemAction} from "./template-items";

/** Drop payload returned by TextEditor.getDragEventData — type/uuid plus arbitrary extras. */
type DropData = Record<string, unknown> & {type?: string; uuid?: string};

interface SheetLike {
    item: Item;
    render(force?: boolean, options?: object): unknown;
}

export async function onDrop(sheet: SheetLike, event: DragEvent): Promise<void> {
    event.preventDefault();
    let data: DropData;
    try {
        data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) as DropData;
    } catch {
        return;
    }

    let item: Item | undefined;
    if (data.type === "Item") {
        item = await onDropItem(sheet, event, data);
    }
    if (!item) return;

    await addTemplateItemAction(sheet, item.name, item.type);
}

export async function onDropItem(
    sheet: SheetLike,
    _event: DragEvent,
    data: DropData,
): Promise<Item | undefined> {
    const item = await Item.implementation.fromDropData(data);

    switch (sheet.item.type) {
        case "item-group":
        case "species-template":
        case "character-template":
            return item;

        case "weapon":
            if (item.type === "specialization" && isWeaponItem(sheet.item)) {
                await sheet.item.update({"system.stats.specialization": item.name}, {diff: true});
            }
    }
    return undefined;
}
