/**
 * Merge two arrays by element property
 */
export function mergeByProperty<T extends Record<string, unknown>>(
    target: T[],
    source: T[],
    prop: keyof T,
): void {
    source.forEach((sourceElement) => {
        const targetElement = target.find((te) => sourceElement[prop] === te[prop]);
        if (targetElement) Object.assign(targetElement, sourceElement);
        else target.push(sourceElement);
    })
}

export async function getSkillsFromTemplate(items: Item[]): Promise<Item[]> {
    const foundSkills: Item[] = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'skill') {
            const found = await getItemByName(items[i].name);
            if (found) foundSkills.push(found);
        }
    }
    return foundSkills;
}

/**
 * Search for and get an item from compendia by id
 */
export async function _getItemFromCompendiumId(id: string): Promise<Item | null> {
    let packs: CompendiumPack[];
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = game.packs.filter((p) => p.metadata.packageName !== 'od6s' && p.documentName === 'Item');
    } else {
        packs = game.packs.filter((p) => p.documentName === 'Item');
    }
    for (const p of packs) {
        const index = await p.getIndex();
        const searchResult = index.find((t) => t._id === id);
        if (searchResult) {
            return await p.getDocument(searchResult._id) as Item | null;
        }
    }
    return null;
}

/**
 * Search for and get an item from compendia by name
 */
export async function _getItemFromCompendium(itemName: string): Promise<Item | null> {
    let packs: CompendiumPack[];
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = game.packs.filter((p) => p.metadata.packageName !== 'od6s' && p.documentName === 'Item');
    } else {
        packs = game.packs.filter((p) => p.documentName === 'Item');
    }
    for (const p of packs) {
        const index = await p.getIndex();
        const searchResult = index.find((t) => t.name === itemName);
        if (searchResult) {
            return await p.getDocument(searchResult._id) as Item | null;
        }
    }
    return null;
}

/**
 * Get an item from the world
 */
export async function _getItemFromWorld(itemName: string): Promise<Item | undefined> {
    return game.items.contents.find(t => t.name === itemName);
}

/**
 * Get an item, preferring world over compendia
 */
export async function getItemByName(itemName: string): Promise<Item | undefined> {
    const worldItem = await _getItemFromWorld(itemName);
    if (worldItem) return worldItem;
    const compItem = await _getItemFromCompendium(itemName);
    if (compItem) return compItem;
    return undefined;
}

/**
 * Get all items of a certain type from compendia
 */
export function getItemsFromCompendiumByType(itemType: OD6SItemType): Array<{_id: string; name: string; type: string}> {
    let searchResult: Array<{_id: string; name: string; type: string}> = [];
    let packs: CompendiumPack[];
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = game.packs.filter((p) => p.metadata.packageName !== 'od6s' && p.documentName === 'Item');
    } else {
        packs = game.packs.filter((p) => p.documentName === 'Item');
    }

    for (const p of packs) {
        const items = p.index.filter((i) => i.type === itemType);
        searchResult = searchResult.concat(items);
    }

    searchResult.sort((a, b) => a.name.localeCompare(b.name));
    return searchResult;
}

/**
 * Get all items of a certain type from the world
 */
export function getItemsFromWorldByType(itemType: OD6SItemType): Array<{_id: string; name: string; type: string; description: string}> {
    const searchResult: Array<{_id: string; name: string; type: string; description: string}> = [];
    for (const it of game.items.contents) {
        if (it.type === itemType) {
            searchResult.push({
                _id: it._id,
                name: it.name,
                type: it.type,
                description: (it.system as { description?: string }).description ?? '',
            });
        }
    }
    return searchResult;
}

/**
 * Get all items from both compendium and world by type, preferring world to compendia
 */
export function getAllItemsByType(itemType: OD6SItemType): Array<{_id: string; name: string; type: string}> {
    const cItems = getItemsFromCompendiumByType(itemType);
    const wItems = getItemsFromWorldByType(itemType);
    const allItems: Array<{_id: string; name: string; type: string}> = cItems.map((x) => x);
    // Prefer world items over compendium items
    mergeByProperty(allItems as Array<Record<string, unknown>>, wItems as Array<Record<string, unknown>>, 'name');
    allItems.sort((a, b) => a.name.localeCompare(b.name));
    return allItems;
}
