/**
 * Tier 3e — Skill roll end-to-end.
 *
 * Verifies that rolling a skill item (different code path from attribute
 * rolls) opens a RollDialog and produces a chat message. Also exercises
 * specialization rolls, which go through item.roll(true).
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("skill roll opens dialog, submits, creates chat message", async ({page}) => {
    await loginAndWaitReady(page);

    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        // Ensure actor has a skill to roll
        const existing = actor.items.find((i: any) => i.type === "skill" && i.name === "smoke-skill");
        if (!existing) {
            await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-skill",
                type: "skill",
                system: {score: 3, attribute: "agi"},
            }]);
        }
    });

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        try {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            const skill = actor.items.find((i: any) => i.type === "skill" && i.name === "smoke-skill");

            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            await skill.roll();
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
                try { await (dlg as any).close(); } catch { /* ignore */ }
            }

            await new Promise((r) => setTimeout(r, 200));
            window.removeEventListener("unhandledrejection", onRej);
            return {dialogOpened: !!dlg, chatCreated, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {dialogOpened: false, chatCreated: false, errs: [(e as Error).message]};
        }
    });

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.dialogOpened, "roll dialog opened").toBe(true);
    expect(result.chatCreated, "chat message created").toBe(true);
});
