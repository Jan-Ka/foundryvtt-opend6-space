/**
 * Tier 3h — Edit-difficulty chat-card flow.
 *
 * Rolls an attribute, patches the message to have a known Easy difficulty
 * (simulating the GM selecting from the chat card dropdown), then opens the
 * OD6SEditDifficulty form and submits a new base difficulty. Verifies that
 * the message flags are re-computed.
 *
 * Underlying arithmetic is unit-tested by edit-difficulty-math.test.ts.
 * This test covers: click handler → dialog open → form submit → flag update.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("edit-difficulty dialog updates message difficulty and success flags", async ({page}) => {
    await loginAndWaitReady(page);

    // Ensure smoke-character exists
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        if (actor.system.attributes.agi.base < 1) {
            await actor.update({"system.attributes.agi.base": 10});
        }
    });

    // Roll attribute → get message
    const msgId: string | null = await evalInWorld(page, async () => {
        const actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        const apps0 = new Set([...window.foundry.applications.instances.keys()]);

        await actor.rollAttribute("agi");
        await new Promise((r) => setTimeout(r, 400));

        const dlg = [...window.foundry.applications.instances.values()].find(
            (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
        );
        if (!dlg) return null;

        const msgsBefore = window.game.messages.size;
        (dlg as any).element.querySelector('[data-action="submit"]')?.click();
        await new Promise((r) => setTimeout(r, 800));
        try { await (dlg as any).close(); } catch { /* ignore */ }

        if (window.game.messages.size <= msgsBefore) return null;
        const msgs = [...window.game.messages.contents];
        return (msgs[msgs.length - 1]?.id as string) ?? null;
    });

    expect(msgId, "chat message created from roll").toBeTruthy();

    // Stamp message with known difficulty flags so the edit-difficulty path is reachable
    await page.evaluate(async (id: string) => {
        const msg = (window as any).game.messages.get(id);
        if (!msg) throw new Error(`message ${id} not found`);
        await msg.update({
            flags: {
                od6s: {
                    isKnown: true,
                    difficulty: 10,
                    baseDifficulty: 10,
                    difficultyLevel: "OD6S.DIFFICULTY_EASY",
                    type: "skill",
                    subtype: "",
                },
            },
        });
        await new Promise((r) => setTimeout(r, 300));
    }, msgId as string);

    // Open the edit-difficulty dialog — replicates the chat-log click handler
    await page.evaluate(async (id: string) => {
        const msg = (window as any).game.messages.get(id);
        if (!msg) throw new Error(`message ${id} not found`);
        const baseDifficulty = msg.getFlag("od6s", "baseDifficulty");
        const modifiers = msg.getFlag("od6s", "modifiers") ?? [];

        // The click handler in chat-log-listeners.ts creates OD6SEditDifficulty
        // and renders it. We trigger the same path by finding the registered app
        // through foundry's application registry or the global config.
        // OD6SEditDifficulty is not a global — use the chat log click event path.
        const chatLog = (window as any).ui?.chat;
        const html = chatLog?.element;
        if (html) {
            const editEl = html.querySelector(`.edit-difficulty[data-message-id="${id}"]`);
            if (editEl) {
                editEl.click();
                return;
            }
        }
        // If the DOM element isn't found (not yet rendered), dispatch a synthetic
        // click on any .edit-difficulty element with the right data attribute or
        // call the registered hook directly via ChatMessage update hooks.
        // As a last resort: look up OD6SEditDifficulty through compendium-class map.
        const appRegistry = Object.values((window as any).foundry?.applications?.registry ?? {});
        const EditDiffClass = appRegistry.find((c: any) => c?.DEFAULT_OPTIONS?.id === "od6s-edit-difficulty") as any;
        if (EditDiffClass) {
            new EditDiffClass({messageId: id, baseDifficulty, modifiers}).render(true);
        }
    }, msgId as string);

    await page.waitForTimeout(600);

    // Find the dialog, fill in new baseDifficulty=15, submit
    const dialogOpened = await evalInWorld(page, async () => {
        const dlg = [...window.foundry.applications.instances.values()].find(
            (a: any) => (a as any).id === "od6s-edit-difficulty",
        );
        if (!dlg) return false;

        const input = (dlg as any).element?.querySelector('input[name="baseDifficulty"]') as HTMLInputElement | null;
        if (input) {
            input.value = "15";
            input.dispatchEvent(new Event("change", {bubbles: true}));
        }
        const form = (dlg as any).element?.querySelector("form") as HTMLFormElement | null;
        if (form) form.requestSubmit();
        await new Promise((r) => setTimeout(r, 800));
        return true;
    });

    expect(dialogOpened, "OD6SEditDifficulty dialog opened and submitted").toBe(true);

    // Verify flags: newDiff = 10 + (15 - 10) = 15
    const updated = await page.evaluate((id: string) => {
        const msg = (window as any).game.messages.get(id);
        return {
            difficulty: msg?.getFlag("od6s", "difficulty") ?? null,
            baseDifficulty: msg?.getFlag("od6s", "baseDifficulty") ?? null,
        };
    }, msgId as string);

    expect(updated.baseDifficulty, "baseDifficulty updated to 15").toBe(15);
    expect(updated.difficulty, "difficulty updated to 15").toBe(15);
});
