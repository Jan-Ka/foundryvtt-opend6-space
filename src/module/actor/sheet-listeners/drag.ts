/**
 * Drag-source wiring for the actor sheet. Owns both the listener registration
 * and the per-source `dragstart` payload builders. The handlers are pure
 * functions of the event (no `this`), so they're attached by reference; the
 * item/effect/crew variants serialize their own dataset shape into
 * `dataTransfer`. The generic `onDragStart` covers the common item / effect /
 * crew-uuid case from `li.dataset` and needs the sheet for document lookups.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sheet = any;

function dragAvailableCombatAction(event: DragEvent): void {
    const data = ((event.target as HTMLElement).children[0] as HTMLElement)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .dataset as any;
    const transferData = {
        name: data.name,
        type: "availableaction",
        subtype: typeof data.subtype !== "undefined" ? data.subtype : data.type,
        itemId: data.id,
        rollable: data.rollable,
    };
    event.dataTransfer!.setData("text/plain", JSON.stringify(transferData));
}

function dragAssignedCombatAction(event: DragEvent): void {
    const data = ((event.target as HTMLElement).children[0] as HTMLElement)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .dataset as any;
    const transferData = {
        name: data.name,
        type: "assignedaction",
        subtype: typeof data.subtype !== "undefined" ? data.subtype : data.type,
        itemId: data.itemId,
        rollable: data.rollable,
        id: data.id,
    };
    event.dataTransfer!.setData("text/plain", JSON.stringify(transferData));
}

function dragCrewMember(event: DragEvent): void {
    const data = (event.target as HTMLElement).dataset;
    const transferData = {crewUuid: data.crewUuid, type: "crewmember"};
    event.dataTransfer!.setData("text/plain", JSON.stringify(transferData));
}

function onDragStart(sheet: Sheet, event: DragEvent): void {
    const li = event.currentTarget as HTMLElement;
    if ("link" in (event.target as HTMLElement).dataset) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dragData: any;
    if (li.dataset.itemId) {
        const item = sheet.document.items.get(li.dataset.itemId);
        dragData = item!.toDragData();
    }
    if (li.dataset.effectId) {
        const effect = sheet.document.effects.get(li.dataset.effectId);
        dragData = effect!.toDragData();
    }
    if (li.dataset.crewUuid) {
        dragData = li.dataset.crewUuid;
    }
    if (!dragData) return;
    event.dataTransfer!.setData("text/plain", JSON.stringify(dragData));
}

/**
 * Register drag event listeners on the actor sheet.
 */
export function registerDragListeners(html: HTMLElement[], sheet: Sheet): void {
    const el = html[0];

    if (sheet.document.isOwner) {
        const handler = (ev: DragEvent) => onDragStart(sheet, ev);

        if (sheet.document.type === 'container' && !game.user.isGM) return;

        // Items
        el.querySelectorAll<HTMLElement>('li.item').forEach((li) => {
            if (li.classList.contains("inventory-header")) return;
            li.setAttribute("draggable", "true");
            li.addEventListener("dragstart", handler, false);
        });

        // Combat Actions
        el.querySelectorAll<HTMLElement>('li.availableaction').forEach((li) => {
            li.setAttribute("draggable", "true");
            li.addEventListener("dragstart", dragAvailableCombatAction, false);
        });
        el.querySelectorAll<HTMLElement>('li.assignedaction').forEach((li) => {
            li.setAttribute("draggable", "true");
            li.addEventListener("dragstart", dragAssignedCombatAction, false);
        });

        // Crewmembers
        el.querySelectorAll<HTMLElement>('li.crew-list').forEach((li) => {
            li.setAttribute('draggable', "true");
            li.addEventListener("dragstart", dragCrewMember, false);
        });
    }
}
