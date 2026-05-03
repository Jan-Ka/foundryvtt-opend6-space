/**
 * Tier 3b — Action-roll dispatch paths uncovered by tier-3-roll /
 * tier-3-skill-roll / tier-3-weapon-roll.
 *
 * Each test triggers actor.rollAction(actionId) for one of the dispatch
 * branches in setupRollData (#98) that has no other smoke coverage:
 *   - brawlattack       → action-brawlattack
 *   - vehicleramattack  → action-vehicleramattack
 *   - vehicletoughness  → resistance-vehicletoughness (top-level type rewrite)
 *
 * Assertion shape mirrors tier-3-weapon-roll: dialog opens, submit produces
 * a chat message with od6s flags. Doesn't pin specific flag values — the
 * flag schema is unstable across the rewrite — only that the path runs end
 * to end without throwing.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

type ActionRollResult = {
    dialogOpened: boolean;
    chatCreated: boolean;
    chatType: string | null;
    errs: string[];
};

async function ensureCharacter(page: import("@playwright/test").Page): Promise<void> {
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        // brawlattack rolls strength damage; need attributes populated.
        if (actor.system.attributes.str.base < 1) {
            await actor.update({
                "system.attributes.str.base": 9,
                "system.attributes.agi.base": 9,
            });
        }
    });
}

async function ensureVehicle(page: import("@playwright/test").Page): Promise<void> {
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-vehicle-action");
        if (!actor) {
            await window.Actor.create({
                name: "smoke-vehicle-action",
                type: "vehicle",
                system: {
                    scale: {score: 3},
                    maneuverability: {score: 6},
                    toughness: {score: 12},
                    move: {value: 84},
                    crew: {value: 1},
                    skill: {value: "Vehicle Operation"},
                    specialization: {value: ""},
                    ram: {score: 6},
                    ram_damage: {score: 6},
                },
            }, {render: false});
        }
    });
}

async function runActionRoll(
    page: import("@playwright/test").Page,
    actorName: string,
    actionId: string,
): Promise<ActionRollResult> {
    return await evalInWorld(page, async (args: {actorName: string; actionId: string}) => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        try {
            const actor = window.game.actors.find((a: any) => a.name === args.actorName);
            if (!actor) throw new Error(`actor ${args.actorName} not found`);

            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            await actor.rollAction(args.actionId);
            await new Promise((r) => setTimeout(r, 500));

            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );

            let chatCreated = false;
            let chatType: string | null = null;
            if (dlg) {
                const msgsBefore = window.game.messages.size;
                (dlg as any).element.querySelector('[data-action="submit"]')?.click();
                await new Promise((r) => setTimeout(r, 800));
                if (window.game.messages.size > msgsBefore) {
                    chatCreated = true;
                    const msgs = [...window.game.messages.contents];
                    const last = msgs[msgs.length - 1];
                    chatType = last?.flags?.od6s?.type ?? null;
                }
                try { await (dlg as any).close(); } catch { /* ignore */ }
            }

            await new Promise((r) => setTimeout(r, 200));
            window.removeEventListener("unhandledrejection", onRej);
            return {dialogOpened: !!dlg, chatCreated, chatType, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {
                dialogOpened: false,
                chatCreated: false,
                chatType: null,
                errs: [(e as Error).message],
            };
        }
    }, {actorName, actionId});
}

test("brawlattack action roll opens dialog and creates chat message", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureCharacter(page);

    const result = await runActionRoll(page, "smoke-character", "brawlattack");

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.dialogOpened, "brawl dialog opened").toBe(true);
    expect(result.chatCreated, "brawl chat message created").toBe(true);
    expect(result.chatType, "message has od6s.type flag").toBeTruthy();
});

test("vehicleramattack action roll opens dialog and creates chat message", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureVehicle(page);

    const result = await runActionRoll(page, "smoke-vehicle-action", "vehicleramattack");

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.dialogOpened, "ram dialog opened").toBe(true);
    expect(result.chatCreated, "ram chat message created").toBe(true);
    expect(result.chatType, "message has od6s.type flag").toBeTruthy();
});

test("vehicletoughness action roll opens dialog and creates chat message", async ({page}) => {
    await loginAndWaitReady(page);
    await ensureVehicle(page);

    const result = await runActionRoll(page, "smoke-vehicle-action", "vehicletoughness");

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.dialogOpened, "toughness dialog opened").toBe(true);
    expect(result.chatCreated, "toughness chat message created").toBe(true);
    // vehicletoughness top-level rewrite collapses to type='resistance' in classifyRoll.
    expect(result.chatType, "message has od6s.type flag").toBeTruthy();
});
