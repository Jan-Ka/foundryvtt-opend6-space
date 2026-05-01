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

            // Range field — system.range.short is a StringField in the schema.
            const rangeInput = root.querySelector(
                'input[name="system.range.short"]',
            ) as HTMLInputElement | null;
            let rangePersisted: string | null = null;
            if (rangeInput) {
                rangeInput.value = "42";
                rangeInput.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 400));
                rangePersisted = String(actor.items.get(weapon.id).system.range.short);
            }

            // Skill field — system.stats.skill is a StringField in the schema.
            const skillInput = root.querySelector(
                'input[name="system.stats.skill"]',
            ) as HTMLInputElement | null;
            let skillPersisted: string | null = null;
            if (skillInput) {
                skillInput.value = "Firearms";
                skillInput.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 400));
                skillPersisted = String(actor.items.get(weapon.id).system.stats.skill);
            }

            await weapon.sheet.close();
            await weapon.delete();
            return {inForm, persistedName, rangePersisted, skillPersisted};
        });

        expect(result.inForm, "weapon name input is direct child of item-sheet form").toBe(true);
        expect(result.persistedName).toBe("smoke-weapon-renamed");
        // #38 regression: range and skill must persist via the form-change
        // submit path, not just direct item.update. Failing soft (null) means
        // the input never rendered, which is itself a regression.
        expect(result.rangePersisted, "system.range.short input rendered and persisted (#38)").toBe("42");
        expect(result.skillPersisted, "system.stats.skill input rendered and persisted (#38)").toBe("Firearms");
    });

    test("item-attribute-edit dialog template has no <form> and named dice/pips inputs", async ({page}) => {
        // Mirrors the actor-side structural test above, for the item-side
        // template used by `_editTemplateAttribute` on species/character
        // templates. Catches a regression where the template carries an
        // outer <form> (nested inside DialogV2's own form → inner form is
        // dropped by HTML parsing) or its inputs lack name= (DialogV2.input
        // returns an empty result and getScoreFromDice produces NaN).
        await loginAndWaitReady(page);

        const result = await evalInWorld(page, async () => {
            const html = await window.foundry.applications.handlebars.renderTemplate(
                "systems/od6s/templates/item/item-attribute-edit.html",
                {score: 5},
            );
            const div = document.createElement("div");
            div.innerHTML = html;
            const innerForms = div.querySelectorAll("form");
            const dice = div.querySelector("#dice") as HTMLInputElement;
            const pips = div.querySelector("#pips") as HTMLInputElement;
            return {
                templateHasInnerForm: innerForms.length > 0,
                diceName: dice?.name,
                pipsName: pips?.name,
            };
        });

        expect(result.templateHasInnerForm, "item-attribute-edit must not wrap content in <form>")
            .toBe(false);
        expect(result.diceName).toBe("dice");
        expect(result.pipsName).toBe("pips");
    });

    test("weapon subtype <option> is selected to match stored value", async ({page}) => {
        // Regression for malformed `(eq localize subtype …)` Handlebars in
        // item-weapon-sheet.html. With `eq` mis-applied no <option> rendered
        // selected, so after a re-render the <select> snapped to the first
        // option, and the next submitOnChange clobbered the saved subtype.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            for (const i of actor.items.filter((x: any) => x.name?.startsWith("smoke-weapon-subtype"))) {
                await i.delete();
            }
            const [weapon] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-weapon-subtype",
                type: "weapon",
            }]);

            await weapon.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));

            const root = weapon.sheet.element as HTMLElement;
            const select = root.querySelector('select[name="system.subtype"]') as HTMLSelectElement;
            const stored = actor.items.get(weapon.id).system.subtype;
            // Selected option's value must match the stored subtype after
            // initial render — otherwise the next form submission silently
            // overwrites system.subtype with the first option's value.
            const selectedMatchesStored = select?.value === stored;

            // Clobber check: change an unrelated field (damage type) and
            // verify subtype is unchanged on the document.
            const damageType = root.querySelector(
                'select[name="system.damage.type"]',
            ) as HTMLSelectElement | null;
            let subtypeAfterDamageChange: string | null = null;
            if (damageType && damageType.options.length > 0) {
                const otherOption = [...damageType.options].find((o) => o.value !== damageType.value);
                if (otherOption) {
                    damageType.value = otherOption.value;
                    damageType.dispatchEvent(new Event("change", {bubbles: true}));
                    await new Promise((r) => setTimeout(r, 500));
                    subtypeAfterDamageChange = actor.items.get(weapon.id).system.subtype;
                }
            }

            await weapon.sheet.close();
            await weapon.delete();
            return {stored, selectedMatchesStored, subtypeAfterDamageChange};
        });

        expect(result.selectedMatchesStored,
            "weapon subtype <select> must reflect the stored value on render").toBe(true);
        if (result.subtypeAfterDamageChange !== null) {
            expect(result.subtypeAfterDamageChange,
                "changing damage type must not clobber stored subtype").toBe(result.stored);
        }
    });

    test("advance dialog submit does not throw on stale event.currentTarget", async ({page}) => {
        // Regression for #42: advanceAction read event.currentTarget.dataset,
        // but the dialog's submit fires async after the click event has been
        // fully dispatched, so currentTarget is null → TypeError.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            // The .advancedialog button is only rendered in advance mode.
            // Also give the actor character points so the cpcost gate
            // doesn't reject the submit.
            await actor.update({
                "system.attributes.agi.base": 6,
                "system.sheetmode.value": "advance",
                "system.characterpoints.value": 50,
            });
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const root = actor.sheet.element as HTMLElement;
            const advanceBtn = root.querySelector(
                '.advancedialog[data-type="attribute"][data-attrname="agi"]',
            ) as HTMLElement | null;
            if (!advanceBtn) {
                await actor.sheet.close();
                return {found: false};
            }

            const errors: string[] = [];
            const onErr = (e: ErrorEvent) => errors.push(String(e.message ?? e));
            const onRej = (e: PromiseRejectionEvent) => errors.push(String(e.reason?.message ?? e.reason));
            window.addEventListener("error", onErr);
            window.addEventListener("unhandledrejection", onRej);

            advanceBtn.click();
            await new Promise((r) => setTimeout(r, 400));

            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => (a as any).id === "od6s-advance-dialog",
            ) as any;

            let submitted = false;
            if (dlg) {
                const dlgRoot = dlg.element as HTMLElement;
                const free = dlgRoot.querySelector(
                    'input[name="freeadvance"]',
                ) as HTMLInputElement | null;
                if (free) {
                    free.checked = true;
                    free.dispatchEvent(new Event("change", {bubbles: true}));
                    await new Promise((r) => setTimeout(r, 250));
                }
                const dice = dlgRoot.querySelector('input[name="dice"]') as HTMLInputElement | null;
                const pips = dlgRoot.querySelector('input[name="pips"]') as HTMLInputElement | null;
                if (dice) dice.value = "7";
                if (pips) pips.value = "0";
                const form = dlgRoot.tagName === "FORM"
                    ? (dlgRoot as HTMLFormElement)
                    : dlgRoot.querySelector("form") as HTMLFormElement | null;
                if (form) {
                    form.requestSubmit();
                    await new Promise((r) => setTimeout(r, 700));
                    submitted = true;
                }
            }

            window.removeEventListener("error", onErr);
            window.removeEventListener("unhandledrejection", onRej);

            const finalBase = window.game.actors.get(actor.id).system.attributes.agi.base;
            await actor.sheet.close();

            const currentTargetErrors = errors.filter(
                (e) => /currentTarget/i.test(e) && /dataset/i.test(e),
            );
            return {found: true, submitted, finalBase, currentTargetErrors};
        });

        if (!result.found) {
            test.skip(true, "no .advancedialog[data-type=attribute] button on the rendered sheet");
            return;
        }
        expect(result.submitted, "advance dialog opened and submitted").toBe(true);
        expect(result.currentTargetErrors,
            "no TypeError reading dataset off a stale event.currentTarget").toEqual([]);
        // base is stored in pips (3 pips = 1 die). dice=7, pips=0 → 7D → 21 pips.
        expect(result.finalBase, "attribute base advanced to dialog value").toBe(21);
    });

    test("attribute-edit dialog submit does not throw on stale event.currentTarget", async ({page}) => {
        // Regression for #42 residual: editAttributeAction read
        // event.currentTarget.dataset.attrname after awaiting DialogV2.input,
        // but currentTarget is null by then → TypeError, update never runs.
        // Mirrors the advance-dialog regression test above.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            await actor.update({
                "system.attributes.agi.base": 6,
                "system.sheetmode.value": "freeedit",
            });
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const root = actor.sheet.element as HTMLElement;
            const editBtn = root.querySelector(
                '.attribute-edit[data-attrname="agi"]',
            ) as HTMLElement | null;
            if (!editBtn) {
                await actor.sheet.close();
                return {found: false};
            }

            const errors: string[] = [];
            const onErr = (e: ErrorEvent) => errors.push(String(e.message ?? e));
            const onRej = (e: PromiseRejectionEvent) => errors.push(String(e.reason?.message ?? e.reason));
            window.addEventListener("error", onErr);
            window.addEventListener("unhandledrejection", onRej);

            editBtn.click();
            // DialogV2.input renders asynchronously; poll for it.
            let dice: HTMLInputElement | null = null;
            let pips: HTMLInputElement | null = null;
            for (let i = 0; i < 30; i++) {
                await new Promise((r) => setTimeout(r, 100));
                dice = document.querySelector('input[name="dice"]') as HTMLInputElement | null;
                pips = document.querySelector('input[name="pips"]') as HTMLInputElement | null;
                if (dice && pips) break;
            }

            let submitted = false;
            if (dice && pips) {
                dice.value = "7";
                pips.value = "0";
                dice.dispatchEvent(new Event("change", {bubbles: true}));
                pips.dispatchEvent(new Event("change", {bubbles: true}));
                const dlgEl = dice.closest(".application") as HTMLElement | null;
                const okBtn = dlgEl?.querySelector(
                    'button[data-action="ok"], button[data-action="submit"], button.dialog-button[data-button="ok"], footer button[type="submit"]',
                ) as HTMLButtonElement | null;
                if (okBtn) {
                    okBtn.click();
                    for (let i = 0; i < 30; i++) {
                        await new Promise((r) => setTimeout(r, 100));
                        if (window.game.actors.get(actor.id).system.attributes.agi.base !== 6) break;
                    }
                    submitted = true;
                }
            }

            window.removeEventListener("error", onErr);
            window.removeEventListener("unhandledrejection", onRej);

            const finalBase = window.game.actors.get(actor.id).system.attributes.agi.base;
            await actor.sheet.close();

            const currentTargetErrors = errors.filter(
                (e) => /currentTarget/i.test(e) && /dataset/i.test(e),
            );
            return {found: true, submitted, finalBase, currentTargetErrors};
        });

        if (!result.found) {
            test.skip(true, "no .attribute-edit[data-attrname=agi] button on the rendered sheet");
            return;
        }
        expect(result.submitted, "attribute-edit dialog opened and submitted").toBe(true);
        expect(result.currentTargetErrors,
            "no TypeError reading dataset off a stale event.currentTarget").toEqual([]);
        // dice=7, pips=0 → 7D → 21 pips.
        expect(result.finalBase, "attribute base updated to dialog value").toBe(21);
    });

    test("character sheet portrait img has editImage action wired (#30)", async ({page}) => {
        // Regression for #30: clicking the character portrait did nothing.
        // ApplicationV2 DocumentSheetV2 dispatches the editImage FilePicker via
        // data-action="editImage" — the legacy data-edit="img" alone is ignored.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 250));
            const img = actor.sheet.element.querySelector(
                "img.profile-img",
            ) as HTMLImageElement | null;
            const hasAction = img?.getAttribute("data-action") === "editImage";
            const hasEdit = img?.getAttribute("data-edit") === "img";
            await actor.sheet.close();
            return {foundImg: !!img, hasAction, hasEdit};
        });

        expect(result.foundImg, "profile img exists on actor sheet").toBe(true);
        expect(result.hasAction,
            "profile img must have data-action=editImage for V2 FilePicker wiring").toBe(true);
        expect(result.hasEdit,
            "profile img must have data-edit=img to identify the path attribute").toBe(true);
    });
});
