/**
 * Sheet helpers for the nested `system.items` array on template-shaped items
 * (item-group, character-template, species-template) and the attribute
 * editor on template items.
 * Extracted from item-sheet.ts; behaviour preserved.
 */

import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../../system/utilities";
import {isItemGroupItem, isTemplateLikeItem} from "../../system/type-guards";

const {DialogV2} = foundry.applications.api;

interface SheetLike {
    item: Item;
    render(force?: boolean, options?: object): unknown;
}

async function getGameItemsByType(
    type: string,
): Promise<Array<{_id: string; name: string; type: string; description?: string}>> {
    const compendia = await od6sutilities.getItemsFromCompendiumByType(type as OD6SItemType);
    const world = await od6sutilities.getItemsFromWorldByType(type as OD6SItemType);
    return [...compendia, ...world].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addTemplateItem(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const type = target.dataset.type!;
    const templateItems = await getGameItemsByType(type);
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/item/item-template-add.html",
        {templateItems});
    const label = game.i18n.localize(game.system.template.Item[type].label);
    const result = await DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.ADD") + " " + label + "!"},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.ADD")},
    });
    if (result?.itemname) await addTemplateItemAction(sheet, result.itemname, type);
}

export async function addTemplateItemAction(sheet: SheetLike, name: string, type: string): Promise<void> {
    const item = sheet.item;
    if (isItemGroupItem(item)) {
        let allowed = false;
        for (const [key, items] of Object.entries(OD6S.allowedItemTypes)) {
            if (item.system.actor_types.includes(key)) {
                for (const i of items as string[]) {
                    if (OD6S.templateItemTypes["item-group"].includes(i)) {
                        allowed = true;
                        break;
                    }
                }
            }
        }
        if (!allowed) return;
    } else if (!OD6S.templateItemTypes[item.type].includes(type)) {
        return;
    }

    if (!isTemplateLikeItem(item)) return;
    const sourceItem = await od6sutilities.getItemByName(name);
    const description = sourceItem?.system.description ?? "";
    const newItem: OD6STemplateItemEntry = {name, type, description};
    (item.system.items as OD6STemplateItemEntry[]).push(newItem);
    await item.update({id: item.id, system: item.system}, {diff: true});
    await sheet.render();
}

export async function editTemplateItem(sheet: SheetLike, event: Event): Promise<void> {
    if (!isTemplateLikeItem(sheet.item)) return;
    const target = event.currentTarget as HTMLElement;
    const items = sheet.item.system.items as OD6STemplateItemEntry[];
    const item = items.find((i) => i.name === target.dataset.name);
    const itemData = {name: target.dataset.name, type: target.dataset.type, description: item?.description};
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/item/item-template-item-edit.html",
        itemData);
    const label = game.i18n.localize(game.system.template.Item[target.dataset.type!].label);
    const result = await DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.EDIT") + " " + label + "!"},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.EDIT")},
    });
    if (typeof result?.itemdesc === "string") {
        await editTemplateItemAction(sheet, result.itemdesc, event);
    }
}

export async function editTemplateItemAction(sheet: SheetLike, desc: string, event: Event): Promise<void> {
    if (!isTemplateLikeItem(sheet.item)) return;
    const target = event.currentTarget as HTMLElement;
    const data = target.dataset;
    const newItem: OD6STemplateItemEntry = {name: data.name!, type: data.type!, description: desc};
    const items = sheet.item.system.items as OD6STemplateItemEntry[];
    const itemIndex = items.findIndex((i) => i.name === data.name && i.type === data.type);
    if (itemIndex < 0) return;
    items[itemIndex] = newItem;
    await sheet.item.update({id: sheet.item.id, system: sheet.item.system}, {diff: false});
    await sheet.render();
}

export async function deleteTemplateItem(sheet: SheetLike, event: Event): Promise<void> {
    if (!isTemplateLikeItem(sheet.item)) return;
    const item = sheet.item;
    const result = await DialogV2.confirm({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.DELETE")},
        content: `<p>${game.i18n.localize("NONEX_IST_OD6S.DELETE_CONFIRM")}</p>`,
    });
    if (!result) return;

    const target = event.currentTarget as HTMLElement;
    const items = item.system.items as OD6STemplateItemEntry[];
    const itemIndex = items.findIndex(
        (i) => i.name === target.dataset.name && i.type === target.dataset.type);
    if (itemIndex < 0) return;
    items.splice(itemIndex, 1);
    await item.update({id: item.id, system: item.system}, {diff: true});
    await sheet.render();
}

export async function editTemplateAttribute(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const score = target.dataset.score;
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/item/item-attribute-edit.html",
        {score});
    const result = await DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.EDIT") + " " + target.dataset.label + "!"},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.EDIT_ATTRIBUTE")},
    });
    if (result) await editAttributeAction(sheet, result.dice, result.pips, event);
}

export async function editAttributeAction(
    sheet: SheetLike,
    dice: string,
    pips: string,
    event: Event,
): Promise<void> {
    const newScore = od6sutilities.getScoreFromDice(Number(dice), Number(pips));
    const target = event.currentTarget as HTMLElement;
    const attrname = target.dataset.attrname!;
    const attributes = (sheet.item.system as {attributes: Record<string, unknown>}).attributes;
    switch (target.dataset.sub) {
        case "base": attributes[attrname] = newScore; break;
        case "min": (attributes[attrname] as {min: number}).min = newScore; break;
        case "max": (attributes[attrname] as {max: number}).max = newScore; break;
    }
    await sheet.item.update({id: sheet.item.id, system: sheet.item.system}, {diff: true});
    await sheet.render();
}
