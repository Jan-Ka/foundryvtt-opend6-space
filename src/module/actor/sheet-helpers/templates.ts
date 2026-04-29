import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Add a character template to an actor via drop.
 */
export async function onDropCharacterTemplate(sheet: any, event: any, item: any, _data: any) {
    if (!sheet.document.isOwner) return false;
    if (sheet.document.type !== 'character') return false;
    // Check if a template has already been assigned to this actor
    if (sheet.document.items.find((E: any) => E.type === 'character-template')) {
        ui.notifications.error(game.i18n.localize("OD6S.ERROR_TEMPLATE_ALREADY_ASSIGNED"));
        return false;
    } else {
        await addCharacterTemplate(sheet, item);
    }
}

/**
 * Add a species template to an actor via drop.
 */
export async function onDropSpeciesTemplate(sheet: any, event: any, item: any, _data: any) {
    const update: any = {};
    update.system = {};

    if (!sheet.document.isOwner) return false;
    if (sheet.document.type !== 'character' && sheet.document.type !== 'npc') return false;
    if (sheet.document.items.find((E: any) => E.type === 'species-template')) {
        ui.notifications.error(game.i18n.localize("OD6S.ERROR_SPECIES_TEMPLATE_ALREADY_ASSIGNED"));
        return false;
    }

    update.system.attributes = {};
    for (const attribute in item.system.attributes) {
        update.system.attributes[attribute] = {};
        update.system.attributes[attribute].min = item.system.attributes[attribute].min;
        update.system.attributes[attribute].max = item.system.attributes[attribute].max;
    }

    update['system.species.content'] = item.name;
    update.id = sheet.document.id;
    await sheet.document.update(update, {diff: true});

    const templateItemsList = await templateItems(sheet, item.system.items);
    templateItemsList.push(item);
    if (templateItemsList.length) {
        await sheet.document.createEmbeddedDocuments('Item', templateItemsList);
    }
}

/**
 * Add an item group to an actor via drop.
 */
export async function onDropItemGroup(sheet: any, event: any, item: any, _data: any) {
    if (!sheet.document.isOwner) return false;

    // Compare group target type to actor type
    if (item.system.actor_types.includes(sheet.document.type)) {
        const templateItemsList = await templateItems(sheet, item.system.items);
        if (templateItemsList.length) {
            await sheet.document.createEmbeddedDocuments('Item', templateItemsList);
        }
    }
}

/**
 * Apply a character template to an actor.
 */
export async function addCharacterTemplate(sheet: any, item: any) {
    const itemData = item.system;
    const update: any = {};
    update.system = {};

    // Set the actor's data to be equal to the data found in the template
    update.system['chartype.content'] = item.name;
    if (update.system['species.content'] === '') {
        update.system['species.content'] = itemData.species;
    }
    update.system['fatepoints.value'] = itemData.fp;
    update.system['characterpoints.value'] = itemData.cp;
    update.system['credits.value'] = itemData.credits;
    update.system['funds.score'] = itemData.funds;
    update.system['move.value'] = itemData.move;
    update.system['background.content'] = itemData.description;
    update.system['metaphysicsextranormal.value'] = itemData.me;

    for (const attribute in itemData.attributes) {
        update.system[`attributes.${attribute}.base`] = itemData.attributes[attribute];
    }
    update.id = sheet.document.id;
    await sheet.document.update(update, {diff: true});

    const templateItemsList = await templateItems(sheet, itemData.items);
    templateItemsList.push(item);
    if (templateItemsList.length) {
        await sheet.document.createEmbeddedDocuments('Item', templateItemsList);
    }
}

/**
 * Takes an array of item names and returns an array of items.
 */
export async function templateItems(sheet: any, itemList: any) {
    // Loop through template items and add to actor from world, then compendia.
    // Filter out items if config is set to do so.
    const result = [];
    for (const i of itemList) {
        let templateItem: Item | null | undefined = await od6sutilities._getItemFromWorld(i.name);
        if (typeof (templateItem) === 'undefined' || templateItem === null) {
            // Check compendia
            templateItem = await od6sutilities._getItemFromCompendium(i.name);
            if (typeof (templateItem) === 'undefined' || templateItem === null) {
                continue;
            }
        }
        if ((i.type === 'advantage' || i.type === 'disadvantage') &&
            game.settings.get('od6s', 'hide_advantages_disadvantages')) continue;
        if (typeof i.description !== 'undefined' && i.description !== '' && i.description !== null) {
            templateItem.description = i.description;
        }

        // Filter out duplicate skills/specializations by name
        if (i.type === 'skill' || i.type === 'specialization' || i.type === 'specialability' ||
            i.type === 'disadvantage' || i.type === 'advanatage') {
            if (sheet.document.items.filter((e: any) => e.type === i.type && e.name === i.name).length) {
                continue;
            }
        }

        // Metaphysics skills get 1D if the attribute is not used
        if (templateItem.type === 'skill' && (templateItem.system as OD6SSkillItemSystem).attribute === 'met' && game.settings.get('od6s', 'metaphysics_attribute_optional')) {
            (templateItem.system as OD6SSkillItemSystem).base = OD6S.pipsPerDice;
        }

        result.push(templateItem);
    }
    return result;
}

/**
 * Clear the character template from an actor.
 */
export async function onClearCharacterTemplate(sheet: any) {
    // Find the template
    const item = sheet.document.items.find((E: any) => E.type === 'character-template');
    if (item) {
        const itemData = item.system;
        const update: any = {};
        update.system = {};

        // Clear template stuff from the actor
        for (const attribute in itemData.attributes) {
            update.system[`attributes.${attribute}.base`] = 0;
        }

        update.system['chartype.content'] = "";
        const speciesTemplate = sheet.document.items.find((E: any) => E.type === 'species-template');
        if (!speciesTemplate) update.system['species.content'] = "";
        update.system['fatepoints.value'] = 0;
        update.system['characterpoints.value'] = 0;
        update.system['credits.value'] = 0;
        update.system['funds.score'] = 0;
        update.system['background.content'] = "";
        update.system['metaphysicsextranormal.value'] = false;
        update.system['move.value'] = 10;
        update.id = sheet.document.id;
        await sheet.document.update(update, {diff: true});

        if (itemData.items !== null && typeof(itemData.items !== 'undefined')) {
            for (const templateItem of itemData.items) {
                const actorItem = sheet.document.items.find((I: any) => I.name === templateItem.name);
                if (typeof (actorItem) !== 'undefined') {
                    await sheet.document.deleteEmbeddedDocuments('Item', [actorItem.id]);
                }
            }
        }
        if (sheet.document.items.get(item.id)) {
            await sheet.document.deleteEmbeddedDocuments('Item', [item.id]);
        }
        sheet.render();
        return true;
    } else {
        return false;
    }
}

/**
 * Clear the species template from an actor.
 */
export async function onClearSpeciesTemplate(sheet: any) {
    // Find the template
    const update: any = {};
    update.system = {};

    const item = sheet.document.items.find((E: any) => E.type === 'species-template');
    if (item) {
        const itemData = item.system;

        // Set attribute min/max to default
        for (const attribute in sheet.document.system.attributes) {
            if (attribute !== 'met') {
                update[`system.attributes.${attribute}`] = {};
                update[`system.attributes.${attribute}`].min = OD6S.pipsPerDice * OD6S.speciesMinDice;
                update[`system.attributes.${attribute}`].max = OD6S.pipsPerDice * OD6S.speciesMaxDice;
            }
        }

        // Clear the species name from the template; check if a character template is applied and replace it from there
        const characterTemplate = sheet.document.items.find((E: any) => E.type === 'character-template');
        if (characterTemplate) {
            update[`system.species.content`] = characterTemplate.system.species;
        } else {
            update[`system.species.content`] = '';
        }

        // Remove items
        if (itemData.items !== null && typeof(itemData.items !== 'undefined')) {
            for (const templateItem of itemData.items) {
                const actorItem = sheet.document.items.find((I: any) => I.name === templateItem.name);
                if (typeof (actorItem) !== 'undefined') {
                    await sheet.document.deleteEmbeddedDocuments('Item', [actorItem.id]);
                }
            }
        }

        await sheet.document.update(update, {diff: true});

        await sheet.document.deleteEmbeddedDocuments('Item', [item.id]);
        sheet.render();
        return true;
    } else {
        return false;
    }
}
