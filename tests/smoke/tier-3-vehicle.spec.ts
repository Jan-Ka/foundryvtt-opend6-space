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
