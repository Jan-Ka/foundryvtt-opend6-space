/**
 * Register active effect and manifestation event listeners on the actor sheet.
 */
export function registerEffectListeners(html: any, sheet: any): void {
    const el = html[0];

    // Update Effect
    el.querySelectorAll('.effect-edit').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            const effect = sheet.document.effects.get(ev.currentTarget.dataset.effectId);
            await effect!.sheet.render(true);
        }));

    // Delete Effect
    el.querySelectorAll('.effect-delete').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            await sheet.document.deleteEmbeddedDocuments('ActiveEffect', [ev.currentTarget.dataset.effectId]);
        }));

    // Activate a manifestation
    el.querySelectorAll('.active-checkbox').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            ev.preventDefault();
            const item = sheet.document.items.find((i: any) => i.id === ev.currentTarget.dataset.itemId);

            if (item) {
                if (item.system.attack) {
                    return;
                }

                const update: any = {};
                update.id = item.id;
                update['system.active'] = !item.system.active;

                await item.update(update);
                const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

                if (actorEffectsList.size > 0) {
                    const actorUpdate: any[] = [];
                    actorEffectsList.forEach((e: any) => {
                        const parts = e.origin?.split(".") ?? [];
                        const parentType = parts[0];
                        let documentType = parts[2];
                        let documentId = parts[3];
                        if (parentType === "Scene") {
                            documentType = parts[4];
                            documentId = parts[5];
                        }
                        if (documentType === "Item") {
                            const effectItem = sheet.document.items.find((i: any) => i.id === documentId);
                            if (effectItem && !effectItem.system.consumable && effectItem.type === 'manifestation') {
                                if (e.disabled === effectItem.system.active) {
                                    const effectUpdate: any = {};
                                    effectUpdate._id = e.id;
                                    effectUpdate.disabled = !item.system.active;
                                    actorUpdate.push(effectUpdate);
                                }
                            }
                        }
                    })
                    await sheet.document.updateEmbeddedDocuments('ActiveEffect', actorUpdate);
                }
            }
            sheet.render();
        }));
}
