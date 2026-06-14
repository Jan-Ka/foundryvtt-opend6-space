/**
 * Register the play-mode-safe combat-action roll triggers (combat-action /
 * vehicle-action click). Bound regardless of `isEditable` so non-edit-mode
 * sheets can still roll attacks.
 */
export function registerCombatRollListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    root.querySelectorAll<HTMLElement>('.combat-action').forEach((elem: HTMLElement) =>
        elem.addEventListener('click', async (ev: Event) => {
            await sheet._rollAvailableAction(ev);
        }));

    root.querySelectorAll<HTMLElement>('.vehicle-action').forEach((elem: HTMLElement) =>
        elem.addEventListener('click', async (ev: Event) => {
            await sheet._rollAvailableVehicleAction(ev);
        }));
}

/**
 * Register combat action-related event listeners on the actor sheet.
 */
export function registerCombatActionListeners(
    root: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {

    // Add/remove actions
    root.querySelectorAll<HTMLElement>('.addaction').forEach((elem: HTMLElement) =>
        elem.addEventListener('click', () => {
            sheet._onActionAdd();
        }));

    root.querySelectorAll<HTMLElement>('.combat-action').forEach((elem: HTMLElement) =>
        elem.addEventListener('contextmenu', (ev: Event) => {
            sheet._onAvailableActionAdd(ev);
        }));

    // Edit misc action
    root.querySelectorAll<HTMLElement>('.editmiscaction').forEach((elem: HTMLElement) =>
        elem.addEventListener('change', async (ev: Event) => {
            const update: Record<string, unknown> = {};
            const ct = ev.currentTarget as HTMLElement;
            update._id = ct.dataset.itemId;
            update.name = (ev.target as HTMLInputElement).value;
            const action = await sheet.document.items.find((i: Item) => i.id === update._id);
            await action!.update(update);
            sheet.render();
        }));

    // Fate point in effect checkbox
    root.querySelectorAll<HTMLElement>('.fatepointeffect').forEach((elem: HTMLElement) =>
        elem.addEventListener('change', async () => {
            // Don't allow if actor has 0 points
            if (sheet.document.system.fatepoints.value < 1) {
                await sheet.document.setFlag('nonex-ist-od6s', 'fatepointeffect', false)
                sheet.render();
                return;
            }

            let inEffect = sheet.document.getFlag('nonex-ist-od6s', 'fatepointeffect');
            await sheet.document.setFlag('nonex-ist-od6s', 'fatepointeffect', !inEffect);
            inEffect = sheet.document.getFlag('nonex-ist-od6s', 'fatepointeffect');
            if (inEffect) {
                const newValue = sheet.document.system.fatepoints.value - 1;
                const update: Record<string, unknown> = {
                    id: sheet.document.id,
                    _id: sheet.document._id,
                    system: {
                        fatepoints: {
                            value: newValue,
                        },
                    },
                };
                await sheet.document.update(update, {diff: true});
            }
        }));
}
