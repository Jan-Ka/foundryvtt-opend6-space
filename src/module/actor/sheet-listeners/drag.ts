/**
 * Register drag event listeners on the actor sheet.
 */
export function registerDragListeners(
    html: HTMLElement[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {
    const el = html[0];

    if (sheet.document.isOwner) {
        const handler = (ev: DragEvent) => sheet._onDragStart(ev);

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
            li.addEventListener("dragstart", sheet._dragAvailableCombatAction, false);
        });
        el.querySelectorAll<HTMLElement>('li.assignedaction').forEach((li) => {
            li.setAttribute("draggable", "true");
            li.addEventListener("dragstart", sheet._dragAssignedCombatAction, false);
        });

        // Crewmembers
        el.querySelectorAll<HTMLElement>('li.crew-list').forEach((li) => {
            li.setAttribute('draggable', "true");
            li.addEventListener("dragstart", sheet._dragCrewMember, false);
        });
    }
}
