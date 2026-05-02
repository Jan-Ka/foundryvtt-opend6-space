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

test("wound dropdown reflects stored value on render and persists round-trip", async ({page}) => {
    // Regression: actor.system.wounds.value persisted via form change correctly,
    // but the dropdown's `selected` comparison inside #each was reaching the
    // wrong context (the iterated deadliness entry, not the actor). The
    // `selected` attribute never rendered, the browser fell back to the first
    // option ("Healthy") on every reopen, and users saw "changing wounds
    // doesn't seem to save".
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-wounds-dropdown")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const actor = await window.Actor.create({
            name: "smoke-wounds-dropdown", type: "character",
        }, {render: false});
        await actor.update({"system.wounds.value": 0});

        // open sheet, change dropdown to first non-zero option, close
        await actor.sheet.render(true);
        await new Promise((r) => setTimeout(r, 250));
        const root1 = actor.sheet.element as HTMLElement;
        const sel1 = root1.querySelector(
            'select[name="system.wounds.value"]',
        ) as HTMLSelectElement | null;
        if (!sel1) {
            await actor.sheet.close();
            await actor.delete();
            return {skipReason: "wounds dropdown not rendered (woundConfig?)"};
        }
        const target = [...sel1.options].find((o) => o.value !== "0");
        if (!target) {
            await actor.sheet.close();
            await actor.delete();
            return {skipReason: "no non-zero wound option (deadliness config?)"};
        }
        const targetVal = target.value;
        const targetNum = Number(targetVal);
        sel1.value = targetVal;
        sel1.dispatchEvent(new Event("change", {bubbles: true}));
        // Poll for the persisted value rather than a fixed sleep — survives slow CI.
        for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 50));
            if (window.game.actors.get(actor.id).system.wounds.value === targetNum) break;
        }
        const persistedAfterChange = window.game.actors.get(actor.id).system.wounds.value;
        await actor.sheet.close();

        // reopen and verify the dropdown reflects the stored value
        await actor.sheet.render(true);
        await new Promise((r) => setTimeout(r, 250));
        const root2 = actor.sheet.element as HTMLElement;
        const sel2 = root2.querySelector(
            'select[name="system.wounds.value"]',
        ) as HTMLSelectElement | null;
        const reopenedSelectValue = sel2?.value;
        const persistedAfterReopen = window.game.actors.get(actor.id).system.wounds.value;

        await actor.sheet.close();
        await actor.delete();
        return {targetVal, persistedAfterChange, reopenedSelectValue, persistedAfterReopen};
    });

    if (result.skipReason) {
        test.skip(true, result.skipReason);
        return;
    }
    expect(String(result.persistedAfterChange),
        "stored wounds.value updates on dropdown change").toBe(result.targetVal);
    expect(String(result.persistedAfterReopen),
        "stored wounds.value survives reopen").toBe(result.targetVal);
    expect(result.reopenedSelectValue,
        "dropdown reflects the stored value on reopen (selected attribute fires)")
        .toBe(result.targetVal);
});
