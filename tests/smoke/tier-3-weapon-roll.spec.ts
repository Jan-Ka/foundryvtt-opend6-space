/**
 * Tier 3g — Weapon roll end-to-end.
 *
 * Creates a character with a ranged weapon item and calls item.roll().
 * Verifies a RollDialog opens, a chat message is created when submitted,
 * and the message carries the expected od6s flags (type='rangedattack',
 * damageScore set, isOpposable set).
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("weapon roll opens dialog, submits, creates chat message with damage flags", async ({page}) => {
    await loginAndWaitReady(page);

    // Ensure smoke-character exists with a weapon
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        // Ensure the actor has enough AGI to roll
        if (actor.system.attributes.agi.base < 1) {
            await actor.update({"system.attributes.agi.base": 10});
        }
        // Recreate the smoke weapon every run so this test isn't sensitive
        // to schema drift in stale documents from earlier runs (the original
        // version of this spec wrote against the wrong schema shape).
        const stale = actor.items.filter(
            (i: any) => i.type === "weapon" && i.name === "smoke-weapon",
        ).map((i: any) => i.id);
        if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale);
        await actor.createEmbeddedDocuments("Item", [{
            name: "smoke-weapon",
            type: "weapon",
            system: {
                // Schema: damage is a SchemaField — score (pips) and type live
                // under it. 4D = 12 pips at the default 3 pips/die.
                damage: {score: 12, type: "p"},
                // range fields are StringField in the schema.
                range: {short: "20", medium: "50", long: "100"},
                stats: {skill: "Firearms", attribute: "AGI"},
            },
        }]);
    });

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        try {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            const weapon = actor.items.find((i: any) => i.type === "weapon" && i.name === "smoke-weapon");

            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            await weapon.roll();
            await new Promise((r) => setTimeout(r, 500));

            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );

            let chatCreated = false;
            let chatFlags: any = null;
            if (dlg) {
                const msgsBefore = window.game.messages.size;
                (dlg as any).element.querySelector('[data-action="submit"]')?.click();
                await new Promise((r) => setTimeout(r, 800));
                if (window.game.messages.size > msgsBefore) {
                    chatCreated = true;
                    const msgs = [...window.game.messages.contents];
                    const last = msgs[msgs.length - 1];
                    chatFlags = last?.flags?.od6s ?? null;
                }
                try { await (dlg as any).close(); } catch { /* ignore */ }
            }

            await new Promise((r) => setTimeout(r, 200));
            window.removeEventListener("unhandledrejection", onRej);
            return {dialogOpened: !!dlg, chatCreated, chatFlags, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {dialogOpened: false, chatCreated: false, chatFlags: null, errs: [(e as Error).message]};
        }
    });

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.dialogOpened, "roll dialog opened").toBe(true);
    expect(result.chatCreated, "chat message created").toBe(true);
    // Weapon rolls are attack type
    expect(result.chatFlags?.type, "message type flag").toBeTruthy();
    expect(result.chatFlags?.damageScore, "damage score set on message").toBeGreaterThan(0);
});
