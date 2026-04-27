/**
 * Tier 3b — Roll flow end-to-end.
 *
 * Submits an attribute roll dialog and confirms a chat message lands.
 * Captures any v14 deprecation warnings — the migration should produce
 * zero on this path.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("attribute roll opens dialog, submits, creates chat message, no deprecation warnings", async ({page}) => {
    await loginAndWaitReady(page);

    // Ensure smoke-character exists with a rollable attribute. Tier 2
    // creates it; if specs are run individually we (re)create here.
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        if (actor.system.attributes.agi.base < 1) {
            await actor.update({"system.attributes.agi.base": 10}); // 3D+1
        }
    });

    const result = await evalInWorld(page, async () => {
        const compatWarnings: string[] = [];
        const oldWarn = window.foundry.utils.logCompatibilityWarning;
        window.foundry.utils.logCompatibilityWarning = (msg: string, opts: any) => {
            compatWarnings.push(msg);
            return oldWarn.call(window.foundry.utils, msg, opts);
        };

        try {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            await actor.rollAttribute("agi");
            await new Promise((r) => setTimeout(r, 400));
            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );

            let chatCreated = false;
            if (dlg) {
                const msgsBefore = window.game.messages.size;
                (dlg as any).element.querySelector('[data-action="submit"]')?.click();
                await new Promise((r) => setTimeout(r, 800));
                chatCreated = window.game.messages.size > msgsBefore;
                try {
                    await (dlg as any).close();
                } catch {
                    // ignore
                }
            }

            return {dialogOpened: !!dlg, chatCreated, compatWarnings};
        } finally {
            window.foundry.utils.logCompatibilityWarning = oldWarn;
        }
    });

    expect(result.dialogOpened).toBe(true);
    expect(result.chatCreated).toBe(true);
    expect(result.compatWarnings, "v14 deprecation warnings").toEqual([]);
});
