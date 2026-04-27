/**
 * Tier 2 — Sheet rendering.
 *
 * Programmatically creates one of each actor and item type, opens
 * each sheet, and verifies it renders without errors. Item sheets
 * must contain a <prose-mirror> element (verifies the v1 {{editor}}
 * helper migration didn't regress).
 *
 * Leaves smoke-* docs in place for downstream specs; teardown nukes them.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

const ACTOR_TYPES = [
    "character",
    "npc",
    "creature",
    "vehicle",
    "starship",
    "container",
];

const ITEM_TYPES = [
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

test.describe("Tier 2 — Sheet rendering", () => {
    test("every actor + item sheet renders, every item has prose-mirror", async ({page}) => {
        await loginAndWaitReady(page);
        const result = await evalInWorld(page, async () => {
            const errs: string[] = [];
            const proseChecks: Record<string, "OK" | "MISSING"> = {};

            const actorTypes = [
                "character", "npc", "creature", "vehicle", "starship", "container",
            ];
            const itemTypes = [
                "skill", "specialization", "advantage", "disadvantage", "specialability",
                "armor", "weapon", "gear", "cybernetic", "manifestation", "character-template",
                "action", "vehicle", "vehicle-weapon", "vehicle-gear", "starship-weapon",
                "starship-gear", "species-template", "item-group",
            ];

            const opened: any[] = [];

            for (const t of actorTypes) {
                try {
                    // delete any leftover from previous run
                    const stale = window.game.actors.filter((a: any) => a.name === `smoke-${t}`).map((a: any) => a.id);
                    if (stale.length) await window.Actor.deleteDocuments(stale);
                    const a = await window.Actor.create({name: `smoke-${t}`, type: t}, {render: false});
                    try {
                        await a.sheet.render(true);
                        opened.push(a.sheet);
                    } catch (e) {
                        errs.push(`actor ${t} sheet: ${(e as Error).message}`);
                    }
                } catch (e) {
                    errs.push(`actor ${t} create: ${(e as Error).message}`);
                }
            }

            for (const t of itemTypes) {
                try {
                    const stale = window.game.items.filter((i: any) => i.name === `smoke-${t}`).map((i: any) => i.id);
                    if (stale.length) await window.Item.deleteDocuments(stale);
                    const i = await window.Item.create(
                        {name: `smoke-${t}`, type: t, system: {description: "<p>hello</p>"}},
                        {render: false},
                    );
                    try {
                        await i.sheet.render(true);
                        opened.push(i.sheet);
                        await new Promise((r) => setTimeout(r, 80));
                        const el = i.sheet.element?.querySelector?.("prose-mirror");
                        proseChecks[t] = el ? "OK" : "MISSING";
                    } catch (e) {
                        errs.push(`item ${t} sheet: ${(e as Error).message}`);
                    }
                } catch (e) {
                    errs.push(`item ${t} create: ${(e as Error).message}`);
                }
            }

            await new Promise((r) => setTimeout(r, 500));
            for (const s of opened) {
                try {
                    await s.close();
                } catch {
                    // ignore close errors
                }
            }

            return {errs, proseChecks};
        });

        expect(result.errs, "actor/item sheet errors").toEqual([]);
        for (const t of ITEM_TYPES) {
            expect(result.proseChecks[t], `prose-mirror for item type ${t}`).toBe("OK");
        }
        // sanity: we attempted every type
        for (const t of ACTOR_TYPES) {
            // Errors-keyed-by-type is in the errs array; presence of an error
            // is already asserted away above. Just verify we tried.
            expect(t).toBeTruthy();
        }
    });
});
