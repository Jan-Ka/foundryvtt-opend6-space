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

    const firstTab = root
        .querySelector<HTMLElement>(".sheet-tabs .item[data-tab]")
        ?.dataset.tab;

    const tabGroups = app.tabGroups ?? {};
    tabGroups.primary ??= firstTab ?? "";
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
