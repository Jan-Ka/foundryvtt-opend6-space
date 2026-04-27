/**
 * Merge two arrays by element property
 */
export function mergeByProperty(target: any, source: any, prop: any): void {
    source.forEach((sourceElement: any) => {
        const targetElement = target.find((targetElement: any) => {
            return sourceElement[prop] === targetElement[prop];
        })
        targetElement ? Object.assign(targetElement, sourceElement) : target.push(sourceElement);
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
    let itemList: any = '';
    let packs: any;
    game.packs.keys();
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = await game.packs.filter(p => p.metadata.packageName !== 'od6s')
    } else {
        packs = await game.packs;
    }
    for (const p of packs) {
        await (p as any).getIndex().then((index: any) => itemList = index);
        const searchResult = (itemList as any).find((t: any) => t._id === id);
        if (searchResult) {
            return await (p as any).getDocument(searchResult._id);
        }
    }
    return null;
}

/**
 * Search for and get an item from compendia by name
 */
export async function _getItemFromCompendium(itemName: string): Promise<Item | null> {
    let itemList: any = '';
    let packs: any;
    game.packs.keys();
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = await game.packs.filter(p => p.metadata.packageName !== 'od6s')
    } else {
        packs = await game.packs;
    }
    for (const p of packs) {
        await (p as any).getIndex().then((index: any) => itemList = index);
        const searchResult = (itemList as any).find((t: any) => t.name === itemName);
        if (searchResult) {
            return await (p as any).getDocument(searchResult._id);
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
export function getItemsFromCompendiumByType(itemType: OD6SItemType): unknown[] {
    let searchResult: any[] = [];
    let packs: any;
    game.packs.keys();
    if (game.settings.get('od6s', 'hide_compendia')) {
        packs = game.packs.filter(p => p.metadata.packageName !== 'od6s' && p.documentName === 'Item')
    } else {
        packs = game.packs.filter(p => p.documentName === 'Item');
    }

    for (const p of packs) {
        const items = p.index.filter((i: any) => i.type === itemType);
        searchResult = (searchResult as any).concat(items);
    }

    searchResult.sort((a, b) => a.name.localeCompare(b.name));
    return searchResult;
}

/**
 * Get all items of a certain type from the world
 */
export function getItemsFromWorldByType(itemType: OD6SItemType): unknown[] {
    const searchResult = [];
    for (let i = 0; i < game.items.contents.length; i++) {
        if (game.items.contents[i].type === itemType) {
            const item = {
                _id: game.items.contents[i]._id,
                name: game.items.contents[i].name,
                type: game.items.contents[i].type,
                description: game.items.contents[i].system.description
            }
            searchResult.push(item);
        }
    }
    return searchResult;
}

/**
 * Get all items from both compendium and world by type, preferring world to compendia
 */
export function getAllItemsByType(itemType: OD6SItemType): unknown[] {
    const cItems = getItemsFromCompendiumByType(itemType);
    const wItems = getItemsFromWorldByType(itemType);
    const allItems = cItems.map((x) => x);
    // Prefer world items over compendium items
    mergeByProperty(allItems, wItems, 'name');
    allItems.sort((a, b) => (a as any).name.localeCompare((b as any).name));
    return allItems;
}
