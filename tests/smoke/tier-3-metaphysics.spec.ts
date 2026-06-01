/**
 * Tier 3 — Metaphysics tab manifestation management.
 *
 * Regression covered:
 *
 *   #163 — The Manifestations column on the character sheet's Metaphysics
 *          tab had no `+` button, so users couldn't add new manifestations
 *          via UI. The shipped compendia have no manifestations to drag in
 *          either, leaving the feature inaccessible.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("metaphysics tab renders an add-manifestation button wired to .item-add (#163)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-metaphysics-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);

        const actor = await window.Actor.create(
            {name: "smoke-metaphysics-actor", type: "character"},
            {render: false},
        );

        // metaphysics tab is only rendered when metaphysicsextranormal is on
        await actor.update({"system.metaphysicsextranormal.value": true});

        await actor.sheet.render(true);
        await new Promise((r) => setTimeout(r, 300));

        const root = actor.sheet.element as HTMLElement;
        const metaTab = root.querySelector('a[data-tab="metaphysics"]') as HTMLElement | null;
        const hadMetaTab = !!metaTab;
        metaTab?.click();
        await new Promise((r) => setTimeout(r, 100));

        const addBtn = root.querySelector(
            '.tab.meta .item-add[data-type="manifestation"]',
        ) as HTMLElement | null;
        const hadAddBtn = !!addBtn;

        await actor.sheet.close();
        await actor.delete();

        return {hadMetaTab, hadAddBtn};
    });

    expect(result.hadMetaTab, "metaphysics tab rendered with extranormal enabled").toBe(true);
    expect(result.hadAddBtn, ".item-add[data-type=manifestation] present").toBe(true);
});
