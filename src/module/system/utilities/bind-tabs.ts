/**
 * Wires `foundry.applications.ux.Tabs` to a sheet's `.sheet-tabs` nav so the
 * panes inside `.sheet-body` toggle correctly, persisting the active tab on
 * the application's `tabGroups.primary` field.
 *
 * The previous tab is restored if available; otherwise the first
 * `[data-tab]` element in the nav is used. This avoids hard-coding a default
 * (e.g. "attributes") that may not exist on every sheet template.
 */

declare const foundry: any;

interface AppWithTabGroups {
    tabGroups?: Record<string, string>;
}

export function bindPrimaryTabs(app: AppWithTabGroups, root: HTMLElement): void {
    if (!root.querySelector(".sheet-tabs")) return;

    // Collect every data-tab declared in the rendered nav. We use this to
    // (a) supply a fallback when no tab has been previously selected and
    // (b) validate any persisted selection — conditional tabs (e.g.
    // metaphysics, vehicle) can disappear when actor flags toggle, leaving
    // tabGroups.primary pointing at a tab that no longer exists.
    const availableTabs = Array.from(
        root.querySelectorAll<HTMLElement>(".sheet-tabs .item[data-tab]"),
    )
        .map((el) => el.dataset.tab)
        .filter((t): t is string => !!t);

    const firstTab = availableTabs[0] ?? "";

    const tabGroups = app.tabGroups ?? {};
    if (!tabGroups.primary || !availableTabs.includes(tabGroups.primary)) {
        tabGroups.primary = firstTab;
    }
    app.tabGroups = tabGroups;

    new foundry.applications.ux.Tabs({
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: tabGroups.primary,
        group: "primary",
        callback: (_ev: Event, _tabs: unknown, active: string) => {
            (app.tabGroups ??= {}).primary = active;
        },
    }).bind(root);
}
