/**
 * Register combat action-related event listeners on the actor sheet.
 */
export function registerCombatActionListeners(html: any, sheet: any): void {
    const el = html[0];

    // Add/remove actions
    el.querySelectorAll('.addaction').forEach((elem: any) =>
        elem.addEventListener('click', () => {
            sheet._onActionAdd();
        }));

    el.querySelectorAll('.combat-action').forEach((elem: any) =>
        elem.addEventListener('contextmenu', (ev: any) => {
            sheet._onAvailableActionAdd(ev);
        }));

    // Roll available action
    el.querySelectorAll('.combat-action').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            await sheet._rollAvailableAction(ev);
        }));

    // Roll available vehicle action
    el.querySelectorAll('.vehicle-action').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            await sheet._rollAvailableVehicleAction(ev);
        }));

    // Edit misc action
    el.querySelectorAll('.editmiscaction').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const update: any = {};
            update._id = ev.currentTarget.dataset.itemId;
            update.name = ev.target.value;
            const action = await sheet.document.items.find((i: any) => i.id === update._id);
            await action!.update(update);
            sheet.render();
        }));

    // Fate point in effect checkbox
    el.querySelectorAll('.fatepointeffect').forEach((elem: any) =>
        elem.addEventListener('change', async () => {
            // Don't allow if actor has 0 points
            if (sheet.document.system.fatepoints.value < 1) {
                await sheet.document.setFlag('od6s', 'fatepointeffect', false)
                sheet.render();
                return;
            }

            let inEffect = sheet.document.getFlag('od6s', 'fatepointeffect');
            await sheet.document.setFlag('od6s', 'fatepointeffect', !inEffect);
            inEffect = sheet.document.getFlag('od6s', 'fatepointeffect');
            if (inEffect) {
                const update: any = {};
                update.system = {};
                update.system.fatepoints = {};
                update.id = sheet.document.id;
                update._id = sheet.document._id;
                update.system.fatepoints.value = sheet.document.system.fatepoints.value -= 1;
                await sheet.document.update(update, {diff: true});
            }
        }));
}
