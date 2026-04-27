/**
 * Tier 3f — Damage pipeline.
 *
 * applyDamage() is the vehicle/starship damage track (string damage levels
 * like OD6S.DAMAGE_VERY_LIGHT). applyWounds() is the character wound track.
 * This test covers both paths, verifying state transitions and schema
 * correctness for each.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("vehicle applyDamage transitions damage level without errors", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        let vehicle: any = null;
        try {
            vehicle = await window.Actor.create({
                name: "smoke-vehicle-damage",
                type: "vehicle",
            }, {render: false});

            // Initial state should be no damage
            const before = vehicle.system.damage.value;

            await vehicle.applyDamage("OD6S.DAMAGE_VERY_LIGHT");
            const afterLight = vehicle.system.damage.value;

            await vehicle.applyDamage("OD6S.DAMAGE_HEAVY");
            const afterHeavy = vehicle.system.damage.value;

            await new Promise((r) => setTimeout(r, 200));
            window.removeEventListener("unhandledrejection", onRej);
            return {before, afterLight, afterHeavy, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {before: null, afterLight: null, afterHeavy: null, errs: [(e as Error).message]};
        } finally {
            try { if (vehicle) await vehicle.delete(); } catch { /* ignore */ }
        }
    });

    expect(result.errs, "damage pipeline errors").toEqual([]);
    expect(result.before).toBe("OD6S.NO_DAMAGE");
    expect(result.afterLight).toBe("OD6S.DAMAGE_VERY_LIGHT");
    expect(result.afterHeavy).toBe("OD6S.DAMAGE_HEAVY");
});

test("character wound escalation reaches incapacitated without schema errors", async ({page}) => {
    await loginAndWaitReady(page);

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
        await actor.update({"system.wounds.value": 0});
        for (const e of [...actor.effects.contents]) {
            try { await e.delete(); } catch { /* ignore */ }
        }

        try {
            await actor.applyWounds("OD6S.WOUNDS_INCAPACITATED");
        } catch (e) {
            errs.push("incapacitated: " + (e as Error).message);
        }
        const afterIncap = actor.system.wounds.value;

        await new Promise((r) => setTimeout(r, 200));
        window.removeEventListener("unhandledrejection", onRej);

        // Cleanup
        await actor.update({"system.wounds.value": 0});
        for (const e of [...actor.effects.contents]) {
            try { await e.delete(); } catch { /* ignore */ }
        }

        return {afterIncap, errs};
    });

    expect(result.errs, "wound escalation errors").toEqual([]);
    expect(result.afterIncap).toBeGreaterThan(0);
});
