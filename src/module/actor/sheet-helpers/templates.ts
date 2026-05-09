import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";
import {isSkillItem} from "../../system/type-guards";

/**
 * Minimal sheet shape used by the template helpers. Avoiding `OD6SActorSheet`
 * here breaks the actor-sheet ↔ helpers import cycle.
 */
interface ActorSheetLike {
    document: Actor;
    render: () => unknown;
}

/**
 * Add a character template to an actor via drop.
 */
export async function onDropCharacterTemplate(
    sheet: ActorSheetLike,
    _event: Event,
    item: OD6SCharacterTemplateItem,
    _data: Record<string, unknown>,
): Promise<false | undefined> {
    if (!sheet.document.isOwner) return false;
    if (sheet.document.type !== 'character') return false;
    // Check if a template has already been assigned to this actor
    if (sheet.document.items.find((E: Item) => E.type === 'character-template')) {
        ui.notifications.error(game.i18n.localize("OD6S.ERROR_TEMPLATE_ALREADY_ASSIGNED"));
        return false;
    }
    await addCharacterTemplate(sheet, item);
    return undefined;
}

/**
 * Add a species template to an actor via drop.
 */
export async function onDropSpeciesTemplate(
    sheet: ActorSheetLike,
    _event: Event,
    item: OD6SSpeciesTemplateItem,
    _data: Record<string, unknown>,
): Promise<false | undefined> {
    if (!sheet.document.isOwner) return false;
    if (sheet.document.type !== 'character' && sheet.document.type !== 'npc') return false;
    if (sheet.document.items.find((E: Item) => E.type === 'species-template')) {
        ui.notifications.error(game.i18n.localize("OD6S.ERROR_SPECIES_TEMPLATE_ALREADY_ASSIGNED"));
        return false;
    }

    const update: Record<string, unknown> = {};
    const attributes: Record<string, { min: number; max: number }> = {};
    for (const attribute in item.system.attributes) {
        attributes[attribute] = {
            min: item.system.attributes[attribute as keyof typeof item.system.attributes].min,
            max: item.system.attributes[attribute as keyof typeof item.system.attributes].max,
        };
    }
    update.system = {attributes};
    update['system.species.content'] = item.name;
    update.id = sheet.document.id;
    await sheet.document.update(update, {diff: true});

    const templateItemsList = await templateItems(sheet, item.system.items);
    templateItemsList.push(item);
    if (templateItemsList.length) {
        await sheet.document.createEmbeddedDocuments('Item', templateItemsList);
    }
    return undefined;
}

/**
 * Add an item group to an actor via drop.
 */
export async function onDropItemGroup(
    sheet: ActorSheetLike,
    _event: Event,
    item: OD6SItemGroupItem,
    _data: Record<string, unknown>,
): Promise<false | undefined> {
    if (!sheet.document.isOwner) return false;

    // Compare group target type to actor type
    if (item.system.actor_types.includes(sheet.document.type)) {
        const templateItemsList = await templateItems(sheet, item.system.items);
        if (templateItemsList.length) {
            await sheet.document.createEmbeddedDocuments('Item', templateItemsList);
        }
    }
    return undefined;
}

/**
 * Apply a character template to an actor.
 */
export async function addCharacterTemplate(
    sheet: ActorSheetLike,
    item: OD6SCharacterTemplateItem,
): Promise<void> {
    const itemData = item.system;
    const update: Record<string, unknown> = {};
    const system: Record<string, unknown> = {};

    // Set the actor's data to be equal to the data found in the template.
    // Only fill species from the template if the actor doesn't already have one
    // (e.g. from a previously-applied species-template item).
    system['chartype.content'] = item.name;
    const currentSpecies = (sheet.document.system as { species?: { content?: string } })
        .species?.content ?? '';
    if (currentSpecies === '') {
        system['species.content'] = itemData.species;
    }
    system['fatepoints.value'] = itemData.fp;
    system['characterpoints.value'] = itemData.cp;
    system['credits.value'] = itemData.credits;
    system['funds.score'] = itemData.funds;
    system['move.value'] = itemData.move;
    system['background.content'] = itemData.description;
    system['metaphysicsextranormal.value'] = itemData.me;

    for (const attribute in itemData.attributes) {
        system[`attributes.${attribute}.base`] = itemData.attributes[attribute as keyof typeof itemData.attributes];
    }
    update.system = system;
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
export async function templateItems(
    sheet: ActorSheetLike,
    itemList: OD6STemplateItemEntry[],
): Promise<Item[]> {
    // Loop through template items and add to actor from world, then compendia.
    // Filter out items if config is set to do so.
    const result: Item[] = [];
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
            (templateItem as Item & { description?: string }).description = i.description;
        }

        // Filter out duplicate skills/specializations by name
        if (i.type === 'skill' || i.type === 'specialization' || i.type === 'specialability' ||
            i.type === 'disadvantage' || i.type === 'advantage') {
            if (sheet.document.items.filter((e: Item) => e.type === i.type && e.name === i.name).length) {
                continue;
            }
        }

        // Metaphysics skills get 1D if the attribute is not used
        if (isSkillItem(templateItem) && templateItem.system.attribute === 'met' && game.settings.get('od6s', 'metaphysics_attribute_optional')) {
            templateItem.system.base = OD6S.pipsPerDice;
        }

        result.push(templateItem);
    }
    return result;
}

/**
 * Clear the character template from an actor.
 */
export async function onClearCharacterTemplate(sheet: ActorSheetLike): Promise<boolean> {
    // Find the template
    const item = sheet.document.items.find((E: Item) => E.type === 'character-template') as
        OD6SCharacterTemplateItem | undefined;
    if (item) {
        const itemData = item.system;
        const system: Record<string, unknown> = {};

        // Clear template stuff from the actor
        for (const attribute in itemData.attributes) {
            system[`attributes.${attribute}.base`] = 0;
        }

        system['chartype.content'] = "";
        const speciesTemplate = sheet.document.items.find((E: Item) => E.type === 'species-template');
        if (!speciesTemplate) system['species.content'] = "";
        system['fatepoints.value'] = 0;
        system['characterpoints.value'] = 0;
        system['credits.value'] = 0;
        system['funds.score'] = 0;
        system['background.content'] = "";
        system['metaphysicsextranormal.value'] = false;
        system['move.value'] = 10;
        const update: Record<string, unknown> = {system, id: sheet.document.id};
        await sheet.document.update(update, {diff: true});

        if (itemData.items != null) {
            for (const templateItem of itemData.items) {
                const actorItem = sheet.document.items.find((I: Item) => I.name === templateItem.name);
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
export async function onClearSpeciesTemplate(sheet: ActorSheetLike): Promise<boolean> {
    const item = sheet.document.items.find((E: Item) => E.type === 'species-template') as
        OD6SSpeciesTemplateItem | undefined;
    if (item) {
        const itemData = item.system;
        const update: Record<string, unknown> = {};

        // Set attribute min/max to default
        const docSystem = sheet.document.system as { attributes?: Record<string, unknown> };
        for (const attribute in docSystem.attributes ?? {}) {
            if (attribute !== 'met') {
                update[`system.attributes.${attribute}`] = {
                    min: OD6S.pipsPerDice * OD6S.speciesMinDice,
                    max: OD6S.pipsPerDice * OD6S.speciesMaxDice,
                };
            }
        }

        // Clear the species name from the template; check if a character template is applied and replace it from there
        const characterTemplate = sheet.document.items.find((E: Item) => E.type === 'character-template') as
            OD6SCharacterTemplateItem | undefined;
        if (characterTemplate) {
            update[`system.species.content`] = characterTemplate.system.species;
        } else {
            update[`system.species.content`] = '';
        }

        // Remove items
        if (itemData.items != null) {
            for (const templateItem of itemData.items) {
                const actorItem = sheet.document.items.find((I: Item) => I.name === templateItem.name);
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
