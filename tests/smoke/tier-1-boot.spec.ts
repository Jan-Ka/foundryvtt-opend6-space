/**
 * Tier 1 — Boot & registration.
 *
 * Mirrors the runbook block. Verifies the system manifest parsed,
 * data models registered for every actor/item type, sheet classes
 * installed, all packs reachable, custom dice terms registered,
 * status effects loaded, and socketlib active.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const EXPECTED_ACTOR_DATA_MODELS = [
    "character",
    "npc",
    "creature",
    "vehicle",
    "starship",
    "container",
];

const EXPECTED_ITEM_DATA_MODELS = [
    "skill",
    "specialization",
    "advantage",
    "disadvantage",
    "specialability",
    "armor",
    "weapon",
    "gear",
    "cybernetic",
    "manifestation",
    "character-template",
    "action",
    "vehicle",
    "vehicle-weapon",
    "vehicle-gear",
    "starship-weapon",
    "starship-gear",
    "species-template",
    "item-group",
];

test.describe("Tier 1 — Boot & registration", () => {
    test.beforeAll(async ({browser}) => {
        const page = await browser.newPage();
        await loginAndWaitReady(page);
        await page.close();
    });

    test("system manifest parsed and active", async ({page}) => {
        await loginAndWaitReady(page);
        const r = await evalInWorld(page, () => ({
            id: window.game.system.id,
            version: window.game.system.version,
            foundry: window.game.version,
        }));
        expect(r.id).toBe("od6s");
        expect(r.foundry).toMatch(/^14\./);
    });

    test("data models registered for every actor and item type", async ({page}) => {
        await loginAndWaitReady(page);
        const r = await evalInWorld(page, () => ({
            actor: Object.keys(window.CONFIG.Actor.dataModels ?? {}).sort(),
            item: Object.keys(window.CONFIG.Item.dataModels ?? {}).sort(),
        }));
        expect(r.actor).toEqual([...EXPECTED_ACTOR_DATA_MODELS].sort());
        expect(r.item).toEqual([...EXPECTED_ITEM_DATA_MODELS].sort());
    });

    test("sheet classes registered", async ({page}) => {
        await loginAndWaitReady(page);
        const r = await evalInWorld(page, () => ({
            actor: window.CONFIG.Actor.sheetClasses?.character?.["od6s.OD6SActorSheet"]?.cls?.name,
            item: window.CONFIG.Item.sheetClasses?.skill?.["od6s.OD6SItemSheet"]?.cls?.name,
        }));
        expect(r.actor).toBe("OD6SActorSheet");
        expect(r.item).toBe("OD6SItemSheet");
    });

    test("all od6s packs are reachable", async ({page}) => {
        await loginAndWaitReady(page);
        const packs = await evalInWorld(page, () =>
            window.game.packs
                .filter((p: any) => p.metadata.packageName === "od6s")
                .map((p: any) => p.metadata.name)
                .sort(),
        );
        // Expect 14 packs declared in system.json (see Tier 0 build output).
        expect(packs.length).toBe(14);
    });

    test("custom dice terms registered", async ({page}) => {
        await loginAndWaitReady(page);
        const r = await evalInWorld(page, () => ({
            wild: !!window.CONFIG.Dice.terms?.w,
            cp: !!window.CONFIG.Dice.terms?.b,
        }));
        expect(r.wild).toBe(true);
        expect(r.cp).toBe(true);
    });

    test("status effects loaded with v14 schema", async ({page}) => {
        await loginAndWaitReady(page);
        const r = await evalInWorld(page, () => {
            const effects = window.CONFIG.statusEffects ?? [];
            return {
                count: effects.length,
                allHaveName: effects.every((e: any) => typeof e.name === "string" && e.name.length > 0),
                allHaveImg: effects.every((e: any) => typeof e.img === "string" && e.img.length > 0),
                anyV1Label: effects.some((e: any) => "label" in e),
                anyV1Icon: effects.some((e: any) => "icon" in e),
            };
        });
        expect(r.count).toBeGreaterThan(20);
        expect(r.allHaveName).toBe(true);
        expect(r.allHaveImg).toBe(true);
        expect(r.anyV1Label).toBe(false);
        expect(r.anyV1Icon).toBe(false);
    });

    test("socketlib active", async ({page}) => {
        await loginAndWaitReady(page);
        const active = await evalInWorld(page, () => !!window.game.modules.get("socketlib")?.active);
        expect(active).toBe(true);
    });
});
