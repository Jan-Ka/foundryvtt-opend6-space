/**
 * Sheet helpers for the actor-types whitelist on item-group items.
 * Extracted from item-sheet.ts; behaviour preserved.
 */

import OD6S from "../../config/config-od6s";
import {isItemGroupItem} from "../../system/type-guards";

const {DialogV2} = foundry.applications.api;

export async function addActorType(item: Item): Promise<void> {
    if (!isItemGroupItem(item)) return;
    const data = {
        actorTypes: game["nonex-ist-od6s"].OD6SActor.TYPES.filter((i: string) => !item.system.actor_types.includes(i)),
    };
    const content = await foundry.applications.handlebars.renderTemplate(
        "systems/nonex-ist-od6s/templates/item/item-add-actor-type.html", data);
    const result = await DialogV2.input({
        window: {title: game.i18n.localize("NONEX_IST_OD6S.ADD") + " " + game.i18n.localize("NONEX_IST_OD6S.ACTOR_TYPE")},
        content,
        ok: {label: game.i18n.localize("NONEX_IST_OD6S.ADD")},
    });
    if (result?.["actor-type"]) await addActorTypeAction(item, result["actor-type"]);
}

export async function addActorTypeAction(item: Item, type: string): Promise<void> {
    if (!isItemGroupItem(item)) return;
    const actorTypes = [...item.system.actor_types, type];
    await item.update({id: item.id, system: {actor_types: actorTypes}});
}

export async function deleteActorType(item: Item, ev: Event): Promise<void> {
    if (!isItemGroupItem(item)) return;
    const target = ev.currentTarget as HTMLElement;
    const type = target.dataset.type;
    const actorTypes = item.system.actor_types.filter((i: string) => i !== type);
    const items: OD6STemplateItemEntry[] = [];
    for (const i of item.system.items as OD6STemplateItemEntry[]) {
        for (const t of actorTypes) {
            if (OD6S.allowedItemTypes[t].includes(i.type)) {
                items.push(i);
                break;
            }
        }
    }
    await item.update({id: item.id, system: {actor_types: actorTypes, items}});
}
