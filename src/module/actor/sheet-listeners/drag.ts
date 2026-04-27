/**
 * Register drag event listeners on the actor sheet.
 */
export function registerDragListeners(html: any, sheet: any): void {
    const el = html[0];

    if (sheet.document.isOwner) {
        const handler = (ev: any) => sheet._onDragStart(ev);

        if (sheet.document.type === 'container' && !game.user.isGM) return;

        // Items
        el.querySelectorAll('li.item').forEach((li: any) => {
            if (li.classList.contains("inventory-header")) return;
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", handler, false);
        });

        // Combat Actions
        el.querySelectorAll('li.availableaction').forEach((li: any) => {
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", sheet._dragAvailableCombatAction, false);
        });
        el.querySelectorAll('li.assignedaction').forEach((li: any) => {
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", sheet._dragAssignedCombatAction, false);
        });

        // Crewmembers
        el.querySelectorAll('li.crew-list').forEach((li: any) => {
            li.setAttribute('draggable', true);
            li.addEventListener("dragstart", sheet._dragCrewMember, false);
        });
    }
}
