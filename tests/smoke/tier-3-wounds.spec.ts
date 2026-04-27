/**
 * Tier 3c — Wound flow & status effects.
 *
 * Verifies wound-level transitions and the v14 ActiveEffect schema
 * (`name`/`img` instead of v1 `label`/`icon`). The known regression
 * mode is a `name: may not be undefined` schema validation error
 * fired by the wound hooks when toggling status icons.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("wound transitions advance and status toggle works without schema errors", async ({page}) => {
    await loginAndWaitReady(page);

    // Ensure smoke-character exists
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
    });

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        const actor = window.game.actors.find((a: any) => a.name === "smoke-character");

        // reset state
        await actor.update({"system.wounds.value": 0});
        for (const e of [...actor.effects.contents]) {
            try {
                await e.delete();
            } catch {
                // ignore
            }
        }

        const before = actor.system.wounds.value;

        try {
            await actor.applyWounds("OD6S.WOUNDS_WOUNDED");
        } catch (e) {
            errs.push("wounded: " + (e as Error).message);
        }
        const afterWounded = actor.system.wounds.value;

        try {
            await actor.applyWounds("OD6S.WOUNDS_SEVERELY_WOUNDED");
        } catch (e) {
            errs.push("severe: " + (e as Error).message);
        }
        const afterSevere = actor.system.wounds.value;

        try {
            await actor.toggleStatusEffect("stunned", {active: true});
        } catch (e) {
            errs.push("toggleStun: " + (e as Error).message);
        }

        // wait a tick for any late-fired hooks to settle
        await new Promise((r) => setTimeout(r, 200));

        window.removeEventListener("unhandledrejection", onRej);

        // cleanup
        await actor.update({"system.wounds.value": 0});
        for (const e of [...actor.effects.contents]) {
            try {
                await e.delete();
            } catch {
                // ignore
            }
        }

        return {before, afterWounded, afterSevere, errs};
    });

    expect(result.before).toBe(0);
    expect(result.afterWounded).toBeGreaterThan(0);
    expect(result.afterSevere).toBeGreaterThan(result.afterWounded);
    expect(result.errs, "wound flow errors").toEqual([]);
});
