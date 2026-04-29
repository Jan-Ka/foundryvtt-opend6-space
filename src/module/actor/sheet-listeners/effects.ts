/**
 * Register active effect and manifestation event listeners on the actor sheet.
 */
export function registerEffectListeners(
    html: HTMLElement[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {
    const el = html[0];

    // Update Effect
    el.querySelectorAll<HTMLElement>('.effect-edit').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            const effect = sheet.document.effects.get(ct.dataset.effectId);
            await effect!.sheet.render(true);
        }));

    // Delete Effect
    el.querySelectorAll<HTMLElement>('.effect-delete').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            const ct = ev.currentTarget as HTMLElement;
            await sheet.document.deleteEmbeddedDocuments('ActiveEffect', [ct.dataset.effectId]);
        }));

    // Activate a manifestation
    el.querySelectorAll<HTMLElement>('.active-checkbox').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            const ct = ev.currentTarget as HTMLElement;
            const item = sheet.document.items.find((i: Item) => i.id === ct.dataset.itemId);

            if (item) {
                const itemSys = item.system as OD6SManifestationItemSystem;
                if (itemSys.attack) {
                    return;
                }

                const update: Record<string, unknown> = {
                    id: item.id,
                    'system.active': !itemSys.active,
                };

                await item.update(update);
                const actorEffectsList = sheet.document.getEmbeddedCollection('ActiveEffect');

                if (actorEffectsList.size > 0) {
                    const actorUpdate: Array<Record<string, unknown>> = [];
                    actorEffectsList.forEach((e: ActiveEffect) => {
                        const parts = e.origin?.split(".") ?? [];
                        const parentType = parts[0];
                        let documentType = parts[2];
                        let documentId = parts[3];
                        if (parentType === "Scene") {
                            documentType = parts[4];
                            documentId = parts[5];
                        }
                        if (documentType === "Item") {
                            const effectItem = sheet.document.items.find((i: Item) => i.id === documentId);
                            if (effectItem && effectItem.type === 'manifestation') {
                                const effSys = effectItem.system as OD6SManifestationItemSystem & { consumable?: boolean };
                                if (!effSys.consumable && e.disabled === effSys.active) {
                                    actorUpdate.push({
                                        _id: e.id,
                                        disabled: !itemSys.active,
                                    });
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
