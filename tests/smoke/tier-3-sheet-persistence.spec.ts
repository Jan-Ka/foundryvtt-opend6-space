/**
 * Tier 3 — Sheet field persistence (regression for issue #27).
 *
 * Foundry v14 DocumentSheetV2 / ItemSheetV2 already render their root
 * element as a <form>. Wrapping the template body in another <form> nests
 * the elements; HTML's nested-form parsing drops the inner form, and
 * submitOnChange then misses fields unpredictably.
 *
 * These tests drive the rendered DOM (not actor.update directly) so the
 * regression — fields silently failing to persist — is actually
 * exercised.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

async function ensureCharacter(page: import("@playwright/test").Page): Promise<void> {
    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
        if (actor) await actor.delete();
        actor = await window.Actor.create({
            name: "smoke-persist",
            type: "character",
            system: {sheetmode: {value: "freeedit"}},
        }, {render: false});
        return actor.id;
    });
}

test.describe("Tier 3 — sheet field persistence (#27)", () => {
    test("actor name input persists via submitOnChange", async ({page}) => {
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));

            const input = actor.sheet.element.querySelector('input[name="name"]') as HTMLInputElement;
            const inForm = input?.closest("form") === actor.sheet.element;

            input.value = "smoke-persist-renamed";
            input.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 400));

            const persisted = window.game.actors.get(actor.id).name;
            await actor.sheet.close();
            return {inForm, persisted};
        });

        expect(result.inForm, "name input is direct child of sheet form").toBe(true);
        expect(result.persisted).toBe("smoke-persist-renamed");
    });

    test("metaphysics toggle persists and adds tab", async ({page}) => {
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            // Reset
            await actor.update({"system.metaphysicsextranormal.value": false});

            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));

            const cb = actor.sheet.element.querySelector(
                'input[type="checkbox"][name="system.metaphysicsextranormal.value"]',
            ) as HTMLInputElement;
            cb.checked = true;
            cb.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 500));

            const persisted = window.game.actors.get(actor.id).system.metaphysicsextranormal.value;

            // After re-render, the metaphysics tab nav button should exist
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));
            const tabButton = actor.sheet.element.querySelector(
                '[data-tab="metaphysics"], a[data-tab="metaphysics"]',
            );

            await actor.sheet.close();
            return {persisted, tabPresent: !!tabButton};
        });

        expect(result.persisted).toBe(true);
        expect(result.tabPresent, "metaphysics nav tab present after toggle").toBe(true);
    });

    test("characteristic edit dialog inputs have name attributes", async ({page}) => {
        // The attribute-edit dialog's <input> elements need name= for
        // DialogV2.input() to read their values. Without name=, the result
        // object has no dice/pips and the score recompute silently produces NaN.
        await loginAndWaitReady(page);

        const result = await evalInWorld(page, async () => {
            const html = await window.foundry.applications.handlebars.renderTemplate(
                "systems/od6s/templates/actor/common/attribute-edit.html",
                {score: 5},
            );
            const div = document.createElement("div");
            div.innerHTML = html;
            const dice = div.querySelector("#dice") as HTMLInputElement;
            const pips = div.querySelector("#pips") as HTMLInputElement;
            return {diceName: dice?.name, pipsName: pips?.name};
        });

        expect(result.diceName).toBe("dice");
        expect(result.pipsName).toBe("pips");
    });

    test("attribute-edit form serializes dice/pips values", async ({page}) => {
        // Drives the DialogV2.input() form data path. DialogV2 wraps
        // `options.content` inside its own <form class="dialog-form">,
        // so the template itself must NOT carry a <form> wrapper —
        // otherwise the inputs end up nested and parsing rules drop
        // them. This test mirrors that arrangement: parse the template
        // into a plain <div>, then put that <div> inside a fresh
        // <form> (the role DialogV2 plays) and read FormData.
        await loginAndWaitReady(page);

        const data = await evalInWorld(page, async () => {
            const html = await window.foundry.applications.handlebars.renderTemplate(
                "systems/od6s/templates/actor/common/attribute-edit.html",
                {score: 5},
            );
            const content = document.createElement("div");
            content.innerHTML = html;
            // Asserting the template itself is form-free guards against
            // a regression that would re-introduce the nested-<form>
            // pattern this PR exists to remove.
            const innerForms = content.querySelectorAll("form");
            const form = document.createElement("form");
            form.appendChild(content);
            (form.querySelector("#dice") as HTMLInputElement).value = "3";
            (form.querySelector("#pips") as HTMLInputElement).value = "2";
            const fd = new FormData(form);
            return {
                dice: fd.get("dice"),
                pips: fd.get("pips"),
                templateHasInnerForm: innerForms.length > 0,
            };
        });

        expect(data.templateHasInnerForm, "attribute-edit template must not wrap content in <form>")
            .toBe(false);
        expect(data.dice).toBe("3");
        expect(data.pips).toBe("2");
    });

    test("item name input on item sheet persists", async ({page}) => {
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            // Replace any leftover smoke-weapon
            const stale = actor.items.filter((i: any) => i.name?.startsWith("smoke-weapon"));
            for (const i of stale) await i.delete();
            const [weapon] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-weapon",
                type: "weapon",
            }]);

            await weapon.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));

            const root = weapon.sheet.element as HTMLElement;
            const nameInput = root.querySelector('input[name="name"]') as HTMLInputElement;
            const inForm = nameInput?.closest("form") === root;

            nameInput.value = "smoke-weapon-renamed";
            nameInput.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 400));

            const persistedName = actor.items.get(weapon.id).name;

            // Range field
            const rangeInput = root.querySelector(
                'input[name="system.range.short"], input[name="system.range.medium"], input[name="system.range.long"]',
            ) as HTMLInputElement | null;
            let rangePersisted: number | null = null;
            if (rangeInput) {
                rangeInput.value = "42";
                rangeInput.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 400));
                const path = rangeInput.name.split(".");
                let v: any = actor.items.get(weapon.id);
                for (const k of path) v = v?.[k];
                rangePersisted = Number(v);
            }

            await weapon.sheet.close();
            await weapon.delete();
            return {inForm, persistedName, rangePersisted};
        });

        expect(result.inForm, "weapon name input is direct child of item-sheet form").toBe(true);
        expect(result.persistedName).toBe("smoke-weapon-renamed");
        if (result.rangePersisted !== null) {
            expect(result.rangePersisted).toBe(42);
        }
    });
});
