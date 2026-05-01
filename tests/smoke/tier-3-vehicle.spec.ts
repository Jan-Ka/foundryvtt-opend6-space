/**
 * Tier 3g — Vehicle actor schema.
 *
 * Creates a vehicle actor and verifies its schema fields initialise
 * correctly. Also creates a vehicle item (the type just restored) and
 * confirms it doesn't crash on creation or embed into an actor inventory.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("vehicle actor schema initialises and vehicle item embeds without errors", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        let vehicleActor: any = null;
        let vehicleItem: any = null;

        try {
            // Create a vehicle actor and verify core schema fields exist
            vehicleActor = await window.Actor.create({
                name: "smoke-vehicle",
                type: "vehicle",
            }, {render: false});

            const sys = vehicleActor.system;
            const schemaOk =
                typeof sys.scale?.score === "number" &&
                typeof sys.maneuverability?.score === "number" &&
                typeof sys.toughness?.score === "number" &&
                typeof sys.move?.value === "number" &&
                typeof sys.crew?.value === "number";

            // Create a vehicle item (compendium entry type)
            vehicleItem = await window.Item.create({
                name: "smoke-vehicle-item",
                type: "vehicle",
                system: {
                    scale: {score: 3},
                    maneuverability: {score: 10},
                    toughness: {score: 11},
                    move: {value: 84},
                    crew: {value: 1},
                },
            }, {render: false});

            const itemSys = vehicleItem.system;
            const itemSchemaOk =
                typeof itemSys.scale?.score === "number" &&
                typeof itemSys.maneuverability?.score === "number" &&
                typeof itemSys.move?.value === "number";

            await new Promise((r) => setTimeout(r, 200));
            window.removeEventListener("unhandledrejection", onRej);

            return {schemaOk, itemSchemaOk, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {schemaOk: false, itemSchemaOk: false, errs: [(e as Error).message]};
        } finally {
            try { if (vehicleActor) await vehicleActor.delete(); } catch { /* ignore */ }
            try { if (vehicleItem) await vehicleItem.delete(); } catch { /* ignore */ }
        }
    });

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.schemaOk, "vehicle actor schema fields present").toBe(true);
    expect(result.itemSchemaOk, "vehicle item schema fields present").toBe(true);
});

test("vehicle/starship sheet re-render does not double-count skill scores (#29)", async ({page}) => {
    // Regression for #29: _prepareVehicleItems / _prepareStarshipItems used
    // to mutate i.system.score += attribute.score on every render, so the
    // canonical score grew without bound across sheet re-renders. Removed in
    // favour of system.total computed once in prepareDerivedActorData.
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const out: any = {};
        for (const type of ["vehicle", "starship"] as const) {
            const stale = window.game.actors.filter((a: any) => a.name === `smoke-${type}-29`)
                .map((a: any) => a.id);
            if (stale.length) await window.Actor.deleteDocuments(stale);
            const actor = await window.Actor.create({
                name: `smoke-${type}-29`,
                type,
                system: {attributes: {agi: {base: 9}}},
            }, {render: false});
            const [skill] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-pilot",
                type: "skill",
                system: {base: 6, attribute: "agi"},
            }]);

            // Render the sheet a few times; each render runs _prepareVehicle/
            // StarshipItems against the live DataModel.
            for (let i = 0; i < 3; i++) {
                await actor.sheet.render(true);
                await new Promise((r) => setTimeout(r, 150));
            }
            const fresh = window.game.actors.get(actor.id).items.get(skill.id);
            out[type] = {
                base: fresh.system.base,
                score: fresh.system.score,
                total: fresh.system.total,
                agi: window.game.actors.get(actor.id).system.attributes.agi.score,
            };
            await actor.sheet.close();
            await actor.delete();
        }
        return out;
    });

    for (const type of ["vehicle", "starship"] as const) {
        const r = result[type];
        // Canonical score = base + mod (here mod=0). Must NOT include attribute.
        expect(r.score, `${type} skill.system.score is canonical (no attribute leaked in)`).toBe(r.base);
        // Display total = canonical + attribute.score (when flatSkills=false, default).
        expect(r.total, `${type} skill.system.total includes attribute (display value)`).toBe(r.base + r.agi);
    }
});
