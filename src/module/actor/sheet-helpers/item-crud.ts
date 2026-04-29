import OD6S from "../../config/config-od6s";

/**
 * Delete an item from the actor, with confirmation dialog.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteItem(sheet: any, ev: Event) {
    const ct = ev.currentTarget as HTMLElement;
    // If this is a skill, deny if there are existing specializations.
    if (ct.dataset.type === "skill") {
        for (const i in sheet.document.items) {
            const docItem = sheet.document.items[i] as Item & { skill?: string };
            if (docItem.type === "specialization" && docItem.skill === ct.dataset.itemId) {
                ui.notifications.error(game.i18n.localize("OD6S.ERR_SKILL_HAS_SPEC"));
                return;
            }
        }
    }
    if (ct.dataset.confirm !== "false") {
        let itemId;
        if (typeof ct.dataset.itemId !== 'undefined' && ct.dataset.itemId !== '') {
            itemId = ct.dataset.itemId;
        } else {
            const li = ct.closest<HTMLElement>(".item");
            itemId = li?.dataset.itemId;
        }
        const confirmText = "<p>" + game.i18n.localize("OD6S.DELETE_CONFIRM") + "</p>";
        await Dialog.prompt({
            title: game.i18n.localize("OD6S.DELETE"),
            content: confirmText,
            callback: async () => {
                await sheet.document.deleteEmbeddedDocuments('Item', [itemId]);
                sheet.render(false);
            }
        })
    } else {
        await sheet.document.deleteEmbeddedDocuments('Item', [ct.dataset.itemId]);
        sheet.render(false);
    }
}

/**
 * Add an item to the actor using the add-item dialog.
 */
export async function addItem(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
    ev: Event,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    caller?: any,
) {
    // Lazy-import to avoid circular dependency
    const {OD6SAddItem} = await import("../add-item.js");
    const {od6sutilities} = await import("../../system/utilities.js");

    caller = caller ?? sheet;
    const ct = ev.currentTarget as HTMLElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    data.type = ct.dataset.type!;
    data.attrname = ct.dataset.attrname;
    data.new = !(typeof ct.dataset.new !== 'undefined' && ct.dataset.new === 'false');
    let worldItems: Item[] = [];
    let compendiumItems: Item[] = [];

    data.label = game.i18n.localize('OD6S.ADD') + " " + game.i18n.localize(OD6S.itemLabels[data.type])
    data.label_empty = game.i18n.localize('OD6S.ADD_EMPTY') + " " + game.i18n.localize(OD6S.itemLabels[data.type])

    worldItems = game.items.filter((i: Item) => i.type === data.type);
    const cEntries = od6sutilities.getItemsFromCompendiumByType(data.type);

    if (data.type === 'skill') {
        worldItems = worldItems.filter((i: Item) => (i.system as OD6SSkillItemSystem).attribute === data.attrname);
        for (const i of cEntries) {
            const item = await od6sutilities._getItemFromCompendium((i as Item).name);
            if (item && (item.system as OD6SSkillItemSystem).attribute === data.attrname) {
                compendiumItems.push(item);
            }
        }
    } else {
        for (const i of cEntries) {
            const item = await od6sutilities._getItemFromCompendium((i as Item).name);
            if (item) compendiumItems.push(item);
        }
    }

    //if it is a skill, do not include skills the actor already has
    if (data.type === 'skill') {
        worldItems = worldItems.filter((i: Item) => !sheet.document.items.find((r: Item) => r.name === i.name));
        compendiumItems = compendiumItems.filter((i: Item) => !sheet.document.items.find((r: Item) => r.name === i.name));
    }

    // Prefer world items
    compendiumItems = compendiumItems.filter((i: Item) => !worldItems.find((r: Item) => r.name === i.name));

    data.items = [...worldItems, ...compendiumItems].sort((a: Item, b: Item) => {
        const x = a.name.toUpperCase();
        const y = b.name.toUpperCase();
        return x === y ? 0 : x > y ? 1 : -1;
    })

    data.serializeditems = JSON.stringify(data.items);
    data.actor = sheet.document.id;
    data.token = sheet.document.isToken === true ? sheet.document.token._id : '';
    data.actorType = sheet.document.type;

    if (data.type === 'skill' || data.type === 'spec') {
        if (data.type === 'skill' && data.attrname === 'met' && game.settings.get('od6s', 'metaphysics_attribute_optional')) {
            // No metaphysics attribute, set skill to default of 1D
            data.score = OD6S.pipsPerDice;
        } else {
            data.score = sheet.document.system.attributes[data.attrname].base;
        }
    } else {
        data.score = 0;
    }
    data.caller = caller;
    await new OD6SAddItem(data).render(true);
}

/**
 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function onItemCreate(sheet: any, event: Event) {
    event.preventDefault();
    const header = event.currentTarget as HTMLElement;
    // Get the type of item to create.
    const type = header.dataset.type!;
    // String.prototype.capitalize is provided by Foundry at runtime.
    const capType = (type as string & {capitalize?: () => string}).capitalize?.() ?? type;

    // Grab any data associated with this control.
    const data = foundry.utils.deepClone(header.dataset);
    // Initialize a default name.
    const name = game.i18n.localize('OD6S.NEW') + ' ' + game.i18n.localize('ITEM.Type' + capType);
    // Prepare the item object.
    const itemData: { name: string; type: string; data: Record<string, string | undefined> } = {
        name,
        type,
        data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return sheet.document.createEmbeddedDocuments("Item", [itemData]);
}
