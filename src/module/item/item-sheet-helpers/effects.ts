/**
 * Sheet helpers for embedded ActiveEffect documents on items.
 * Extracted from item-sheet.ts; behaviour preserved.
 */

export async function addEffect(item: Item): Promise<void> {
    const name = game.i18n.localize("OD6S.NEW_ACTIVE_EFFECT");
    const effect = await item.createEmbeddedDocuments("ActiveEffect", [{name}]);
    new foundry.applications.sheets.ActiveEffectConfig({document: effect[0]}).render({force: true});
}

export async function editEffect(item: Item, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = item.getEmbeddedDocument("ActiveEffect", effectId);
    if (!effect) return;
    new foundry.applications.sheets.ActiveEffectConfig({document: effect}).render({force: true});
}

export async function deleteEffect(item: Item, ev: Event): Promise<void> {
    const target = ev.currentTarget as HTMLElement;
    await item.deleteEmbeddedDocuments("ActiveEffect", [target.dataset.effectId!]);
}
