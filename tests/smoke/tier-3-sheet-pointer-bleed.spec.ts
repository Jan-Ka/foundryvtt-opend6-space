/**
 * Tier 3 — Optional sheet-pointer-bleed workaround.
 *
 * Regression covered:
 *
 *   #166 — Modules with window-level `mousedown` listeners (the `Pings`
 *          module is the reported case) fire on clicks over OD6S sheets
 *          under Foundry v14, because ApplicationV2 windows mount to
 *          `document.body` rather than `#interface`. The
 *          `block_sheet_pointer_bleed` client setting installs a
 *          body-level bubble-phase listener that stops `mousedown`
 *          propagation when the event originated inside a sheet/dialog.
 *
 * The test installs a stand-in window-level `mousedown` listener
 * (representing the misbehaving module) and verifies it does NOT fire
 * for a click on a rendered sheet while the setting is enabled, and
 * DOES fire when the setting is disabled.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("block_sheet_pointer_bleed stops mousedown from reaching window listeners (#166)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-bleed-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);

        const actor = await window.Actor.create(
            {name: "smoke-bleed-actor", type: "character"},
            {render: false},
        );
        await actor.sheet.render(true);
        await new Promise((r) => setTimeout(r, 300));

        const root = actor.sheet.element as HTMLElement;

        let windowHits = 0;
        const windowListener = () => { windowHits++; };
        window.addEventListener("mousedown", windowListener, false);

        const dispatch = () => root.dispatchEvent(
            new MouseEvent("mousedown", {bubbles: true, cancelable: true}),
        );

        // 1) Setting OFF — bubble reaches window
        await window.game.settings.set("od6s", "block_sheet_pointer_bleed", false);
        windowHits = 0;
        dispatch();
        const offHits = windowHits;

        // 2) Setting ON — body-level listener stops propagation
        await window.game.settings.set("od6s", "block_sheet_pointer_bleed", true);
        windowHits = 0;
        dispatch();
        const onHits = windowHits;

        // 3) Click outside any sheet should NOT be blocked even when ON
        windowHits = 0;
        document.body.dispatchEvent(
            new MouseEvent("mousedown", {bubbles: true, cancelable: true}),
        );
        const offSheetHits = windowHits;

        // teardown
        window.removeEventListener("mousedown", windowListener, false);
        await window.game.settings.set("od6s", "block_sheet_pointer_bleed", false);
        await actor.sheet.close();
        await actor.delete();

        return {offHits, onHits, offSheetHits};
    });

    expect(result.offHits, "setting off: window listener fires").toBe(1);
    expect(result.onHits, "setting on: window listener blocked").toBe(0);
    expect(result.offSheetHits, "setting on: clicks outside sheets still bubble").toBe(1);
});
