/**
 * Sort items within the actor sheet.
 */
export function onSortItem(sheet: any, event: any, itemData: any) {
    // Get the drag source and drop target
    const items = sheet.document.items;
    const source = items.get(itemData._id);
    const dropTarget = event.target.closest("li[data-item-id]");
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (source!.id === target!.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
        const siblingId = el.dataset.itemId;
        if (siblingId && (siblingId !== source!.id)) siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});
    const updateData = sortUpdates.map((u: any) => {
        const update = u.update;
        update._id = u.target._id;
        return update;
    });

    // Perform the update
    return sheet.document.updateEmbeddedDocuments("Item", updateData);
}

/**
 * Sort crew members within the vehicle sheet.
 */
export async function onSortCrew(sheet: any, event: any, data: any) {
    const crewMembers = [...sheet.document.system.crewmembers];
    const source = crewMembers.filter((c: any) => c.uuid === data.crewUuid)[0];
    const dropTarget = event.target.closest("li[data-crew-uuid]");
    if (!dropTarget) return;
    const target = crewMembers.filter((c: any) => c.uuid === dropTarget.dataset.crewUuid)[0];

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
        const siblingId = el.dataset.crewUuid;
        if (siblingId && (siblingId !== source.uuid)) siblings.push(crewMembers.filter((c: any) => c.uuid === el.dataset.crewUuid)[0]);
    }

    const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});

    const updateData = sortUpdates.map((u: any) => {
        const update = u.update;
        update.uuid = u.target.uuid;
        return update;
    });

    for (let i = 0; i < updateData.length; i++) {
        for (let j = 0; j < crewMembers.length; j++) {
            if (updateData[i].uuid === crewMembers[j].uuid) {
                crewMembers[j].sort = (+updateData[i].sort)
            }
        }
    }

    crewMembers.sort((a: any, b: any) => {
        if (a.sort < b.sort) {
            return -1;
        }
        if (a.sort > b.sort) {
            return 1;
        }
        return 0;
    })

    const updateObject = {
        system: {
            crewmembers: crewMembers
        }
    }

    await sheet.document.update(updateObject);
}

/**
 * Sort cargo items within a vehicle/starship.
 */
export async function onSortCargoItem(sheet: any, event: any, itemData: any) {
    // Get the drag source and its siblings
    const source = sheet.document.items.get(itemData._id);
    const siblings = sheet.document.items.filter((i: any) => {
        return (i._id !== source!._id);
    });

    // Get the drop target
    const dropTarget = event.target.closest("[data-item-id]");
    const targetId = dropTarget ? dropTarget.dataset.itemId : null;
    const target = siblings.find((s: any) => s._id === targetId);

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, {target: target, siblings});
    const updateData = sortUpdates.map((u: any) => {
        const update = u.update;
        update._id = u.target._id;
        return update;
    });

    // Perform the update
    return await sheet.document.updateEmbeddedDocuments("Item", updateData);
}

/**
 * Sort items within a container.
 */
export async function onSortContainerItem(sheet: any, event: any, itemData: any) {
    // Get the drag source and its siblings
    const source = sheet.document.items.get(itemData._id);
    const siblings = sheet.document.items.filter((i: any) => {
        return (i.type === source!.type) && (i._id !== source!._id);
    });

    // Get the drop target
    const dropTarget = event.target.closest("[data-item-id]");
    const targetId = dropTarget ? dropTarget.dataset.itemId : null;
    const target = siblings.find((s: any) => s._id === targetId);

    // Ensure we are only sorting like-types
    if (target && (source!.type !== target.type)) return;

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, {target: target, siblings});
    const updateData = sortUpdates.map((u: any) => {
        const update = u.update;
        update._id = u.target._id;
        return update;
    });

    // Perform the update
    await sheet.document.updateEmbeddedDocuments("Item", updateData);
}
