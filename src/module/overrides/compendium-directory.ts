/**
 * Honors two OD6S settings in the Compendium sidebar:
 * - `hide_compendia`: hides all packs shipped by the `od6s` system except Macros.
 * - `hide_advantages_disadvantages`: hides the advantages and disadvantages packs.
 *
 * Implementation flips `context.packContext[key].hidden`, which is the same property
 * the v14 base class uses for filter-driven hiding (see `_preparePackContext`).
 * That keeps `game.packs` and `context.tree` intact so pack creation/import flows
 * are unaffected.
 */
export class OD6SCompendiumDirectory extends foundry.applications.sidebar.tabs.CompendiumDirectory {
    async _prepareDirectoryContext(context: any, options: any): Promise<void> {
        await super._prepareDirectoryContext(context, options);

        const hideOd6s = game.settings.get("od6s", "hide_compendia");
        const hideAdvDis = game.settings.get("od6s", "hide_advantages_disadvantages");
        if (!hideOd6s && !hideAdvDis) return;

        for (const key of Object.keys(context.packContext)) {
            const pack = game.packs.get(key);
            if (!pack) continue;
            const meta = pack.metadata;
            if (hideOd6s && meta.packageName === "od6s" && pack.documentName !== "Macro") {
                context.packContext[key].hidden = true;
            } else if (hideAdvDis && (meta.name === "advantages" || meta.name === "disadvantages")) {
                context.packContext[key].hidden = true;
            }
        }
    }
}
