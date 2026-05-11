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

    test("weapon item-sheet persists name, range.short, and stats.skill via form change (#38)", async ({page}) => {
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

    test("weapon subtype Melee survives multi-step edits (#55)", async ({page}) => {
        // User-reported repro from #55: create weapon → set Melee →
        // change damage type / toggle str / change dice — every other
        // edit reverts subtype back to Ranged.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            for (const i of actor.items.filter((x: any) => x.name?.startsWith("smoke-weapon-55"))) {
                await i.delete();
            }
            const [weapon] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-weapon-55",
                type: "weapon",
            }]);

            await weapon.sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const trail: Array<{step: string; stored: string; selected: string | null}> = [];
            const snapshot = (step: string) => {
                const root = weapon.sheet.element as HTMLElement;
                const sel = root.querySelector('select[name="system.subtype"]') as HTMLSelectElement | null;
                trail.push({
                    step,
                    stored: actor.items.get(weapon.id).system.subtype,
                    selected: sel ? sel.value : null,
                });
            };

            const meleeLabel = window.game.i18n.localize("OD6S.MELEE");

            snapshot("after-create");

            // Step 1: set Type → Melee.
            const root = () => weapon.sheet.element as HTMLElement;
            const subtype = root().querySelector('select[name="system.subtype"]') as HTMLSelectElement;
            subtype.value = meleeLabel;
            subtype.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 500));
            snapshot("after-set-melee");

            // Step 2: change damage.type.
            const dtype = root().querySelector('select[name="system.damage.type"]') as HTMLSelectElement | null;
            if (dtype) {
                const other = [...dtype.options].find((o) => o.value !== dtype.value);
                if (other) {
                    dtype.value = other.value;
                    dtype.dispatchEvent(new Event("change", {bubbles: true}));
                    await new Promise((r) => setTimeout(r, 500));
                }
            }
            snapshot("after-damage-type");

            // Step 3: toggle damage.str checkbox (only present when Melee).
            const str = root().querySelector('input[name="system.damage.str"]') as HTMLInputElement | null;
            if (str) {
                str.checked = !str.checked;
                str.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 500));
            }
            snapshot("after-toggle-str");

            // Step 4: change damage dice via the editweapondamage handler.
            const diceInput = root().querySelector('.editweapondamage input#dice') as HTMLInputElement | null;
            if (diceInput) {
                diceInput.value = "2";
                diceInput.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 500));
            }
            snapshot("after-dice-edit");

            // Step 5: edit skill text input.
            const skill = root().querySelector('input[name="system.stats.skill"]') as HTMLInputElement | null;
            if (skill) {
                skill.value = "brawling";
                skill.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 500));
            }
            snapshot("after-skill-edit");

            await weapon.sheet.close();
            await weapon.delete();
            return {meleeLabel, trail};
        });

        // Every snapshot after step 1 must show subtype still Melee, both
        // in storage and in the rendered <select>.
        const afterMelee = result.trail.slice(1);
        for (const snap of afterMelee) {
            expect(snap.stored, `[${snap.step}] stored subtype must remain Melee`)
                .toBe(result.meleeLabel);
            if (snap.selected !== null) {
                expect(snap.selected, `[${snap.step}] subtype <select> must show Melee`)
                    .toBe(result.meleeLabel);
            }
        }
    });

    test("starship damage <select> persists non-default level (#65)", async ({page}) => {
        // Same root cause as #55: inside `{{#each ... as |level key|}}`, the
        // option's `(eq key actor.system.damage.value)` check resolves
        // `actor` against the iterated string instead of root context, so
        // no option gets `selected` and the next submit clobbers the value
        // back to whatever the browser is currently showing.
        await loginAndWaitReady(page);

        const result = await evalInWorld(page, async () => {
            for (const a of window.game.actors.filter((x: any) => x.name === "smoke-starship")) {
                await a.delete();
            }
            const ship = await window.Actor.create({
                name: "smoke-starship",
                type: "starship",
                system: {sheetmode: {value: "freeedit"}},
            }, {render: false});

            await ship.sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const root = ship.sheet.element as HTMLElement;
            const sel = root.querySelector('select[name="system.damage.value"]') as HTMLSelectElement | null;
            if (!sel) {
                await ship.sheet.close();
                await ship.delete();
                return {found: false};
            }

            // Pick a non-first option (the bug only surfaces on non-default).
            const initial = sel.value;
            const target = [...sel.options].find((o) => o.value !== initial)?.value;
            if (!target) {
                await ship.sheet.close();
                await ship.delete();
                return {found: false};
            }

            sel.value = target;
            sel.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 500));

            const storedAfterFirst = window.game.actors.get(ship.id).system.damage.value;
            const selAfterFirst = (root.querySelector(
                'select[name="system.damage.value"]',
            ) as HTMLSelectElement | null)?.value ?? null;

            // Second nudge: change an unrelated field (sheetmode) to force a
            // re-render + re-submit cycle and verify damage doesn't revert.
            const mode = root.querySelector(
                'select[name="system.sheetmode.value"]',
            ) as HTMLSelectElement | null;
            if (mode) {
                const otherMode = [...mode.options].find((o) => o.value !== mode.value);
                if (otherMode) {
                    mode.value = otherMode.value;
                    mode.dispatchEvent(new Event("change", {bubbles: true}));
                    await new Promise((r) => setTimeout(r, 500));
                }
            }

            const storedAfterSecond = window.game.actors.get(ship.id).system.damage.value;
            const selAfterSecond = (root.querySelector(
                'select[name="system.damage.value"]',
            ) as HTMLSelectElement | null)?.value ?? null;

            await ship.sheet.close();
            await ship.delete();
            return {found: true, target, storedAfterFirst, selAfterFirst, storedAfterSecond, selAfterSecond};
        });

        if (!result.found) {
            test.skip(true, "starship damage <select> not present");
            return;
        }
        expect(result.storedAfterFirst, "stored damage matches user selection").toBe(result.target);
        expect(result.selAfterFirst, "<select> reflects stored damage after first submit").toBe(result.target);
        expect(result.storedAfterSecond, "damage survives an unrelated re-render").toBe(result.target);
        expect(result.selAfterSecond, "<select> still shows stored damage after re-render").toBe(result.target);
    });

    test("armor sheet damaged <select> persists non-default level (#67)", async ({page}) => {
        // Sister coverage to the weapon-subtype and starship-damage tests
        // for the broader each-block sweep (#67). The armor `damaged`
        // <select> is gated by the optional rule `weapon_armor_damage`,
        // which defaults off in fresh worlds — so the spec flips the
        // setting on for the duration of the probe and restores it
        // afterwards. If the select is still missing with the rule on,
        // that's a real template regression and we want the assertion to
        // fail, not a silent skip.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const prevSetting = window.game.settings.get("od6s", "weapon_armor_damage");
            if (!prevSetting) {
                await window.game.settings.set("od6s", "weapon_armor_damage", true);
            }
            try {
                const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
                for (const i of actor.items.filter((x: any) => x.name?.startsWith("smoke-armor-67"))) {
                    await i.delete();
                }
                const [armor] = await actor.createEmbeddedDocuments("Item", [{
                    name: "smoke-armor-67",
                    type: "armor",
                }]);
                await armor.sheet.render(true);
                await new Promise((r) => setTimeout(r, 300));
                const root = armor.sheet.element as HTMLElement;
                const sel = root.querySelector(
                    'select[name="system.damaged"]',
                ) as HTMLSelectElement | null;
                if (!sel) {
                    await armor.sheet.close();
                    await armor.delete();
                    return {selectPresent: false};
                }
                const initial = sel.value;
                const target = [...sel.options].find((o) => o.value !== initial)?.value;
                if (!target) {
                    await armor.sheet.close();
                    await armor.delete();
                    return {selectPresent: true, target: null};
                }
                sel.value = target;
                sel.dispatchEvent(new Event("change", {bubbles: true}));
                await new Promise((r) => setTimeout(r, 500));

                const storedAfter = actor.items.get(armor.id).system.damaged;
                const selAfter = (root.querySelector(
                    'select[name="system.damaged"]',
                ) as HTMLSelectElement | null)?.value ?? null;

                await armor.sheet.close();
                await armor.delete();
                return {selectPresent: true, target, storedAfter, selAfter};
            } finally {
                if (!prevSetting) {
                    await window.game.settings.set("od6s", "weapon_armor_damage", false);
                }
            }
        });

        expect(result.selectPresent,
            "armor `damaged` <select> must render when weapon_armor_damage is on (template regression?)")
            .toBe(true);
        expect(result.target,
            "armor damage config must expose more than one level (deadliness config?)")
            .toBeTruthy();
        expect(String(result.storedAfter),
            "stored damaged matches user selection").toBe(result.target);
        expect(result.selAfter,
            "<select> reflects stored damaged after submit").toBe(result.target);
    });

    test("sheet-mode footer pins to the bottom of the form (#63)", async ({page}) => {
        // The flex chain is fragile: form.flexcol → inner div.flexcol →
        // .sheet-body { flex: 1 }. If the inner div doesn't carry
        // flex:1 / full-height, .sheet-body collapses to its content
        // and the footer just floats below the body content instead of
        // pinning to the bottom of the sheet.
        await loginAndWaitReady(page);

        const result = await evalInWorld(page, async () => {
            for (const a of window.game.actors.filter((x: any) => x.name === "probe-pin")) {
                await a.delete();
            }
            const a = await window.Actor.create({name: "probe-pin", type: "character"}, {render: false});
            await a.sheet.render(true);
            await new Promise((r) => setTimeout(r, 350));
            const root = a.sheet.element as HTMLElement;
            const form = root.tagName === "FORM" ? root : root.querySelector("form");
            const footer = root.querySelector("section.sheet-mode") as HTMLElement | null;
            const body = root.querySelector("section.sheet-body") as HTMLElement | null;
            const formRect = form?.getBoundingClientRect();
            const footerRect = footer?.getBoundingClientRect();
            const bodyRect = body?.getBoundingClientRect();
            await a.sheet.close();
            await a.delete();
            return {
                formBottom: formRect?.bottom ?? 0,
                footerBottom: footerRect?.bottom ?? 0,
                bodyHeight: bodyRect?.height ?? 0,
                formHeight: formRect?.height ?? 0,
            };
        });

        // Footer's bottom edge should sit close to the form's bottom edge.
        // V14 ApplicationV2's `<section.window-content>` has ~16px of
        // top/bottom padding (Foundry default), so the footer can only reach
        // within `padding-bottom + 1-2px` of the form edge — anything beyond
        // that means the flex chain isn't pinning. On the bug, footer.bottom
        // was hundreds of px above form.bottom.
        const gap = result.formBottom - result.footerBottom;
        expect(gap, "footer pinned within ~24px of form bottom").toBeLessThan(24);
        // .sheet-body should occupy a meaningful share of the form (it has
        // flex:1). The character header carries a large profile-img preview
        // (~30% of the content area on a fresh actor) and there's
        // `window-content` padding, so the body can't be 40% of the *form*
        // — but it should still be > 25% as long as flex:1 is in effect.
        // On the bug, body collapsed to its content (single-digit %).
        expect(result.bodyHeight / result.formHeight, ".sheet-body fills the available space").toBeGreaterThan(0.25);
    });

    test("sheet-mode footer is present on all sheetmode-bearing actor types (#63)", async ({page}) => {
        // The mode toggle was tucked into per-type header partials with
        // inconsistent placement (in-header for npc/creature/vehicle/starship,
        // bottom-left section for character). Lifted to a single footer
        // partial in actor/common/actor-sheet.html so every actor type with
        // a sheetmode field gets the same styled <section class="sheet-mode">
        // pinned at the bottom of the form.
        await loginAndWaitReady(page);

        const result = await evalInWorld(page, async () => {
            const types = ["character", "npc", "creature", "vehicle", "starship"];
            const out: Array<{
                type: string;
                hasSection: boolean;
                hasSelect: boolean;
                optionValues: string[];
                selectedValue: string | null;
                advancePresent: boolean;
            }> = [];
            for (const type of types) {
                for (const a of window.game.actors.filter((x: any) => x.name === `probe-${type}`)) {
                    await a.delete();
                }
                const a = await window.Actor.create({name: `probe-${type}`, type}, {render: false});
                await a.sheet.render(true);
                await new Promise((r) => setTimeout(r, 350));
                const root = a.sheet.element as HTMLElement;
                const section = root.querySelector("section.sheet-mode");
                const sel = section?.querySelector(
                    'select[name="system.sheetmode.value"]',
                ) as HTMLSelectElement | null;
                const optionValues = sel ? [...sel.options].map((o) => o.value) : [];
                out.push({
                    type,
                    hasSection: !!section,
                    hasSelect: !!sel,
                    optionValues,
                    selectedValue: sel?.value ?? null,
                    advancePresent: optionValues.includes("advance"),
                });
                await a.sheet.close();
                await a.delete();
            }
            return out;
        });

        for (const r of result) {
            expect(r.hasSection, `[${r.type}] <section class="sheet-mode"> present`).toBe(true);
            expect(r.hasSelect, `[${r.type}] mode <select> present`).toBe(true);
            expect(r.optionValues, `[${r.type}] always offers normal + freeedit`)
                .toEqual(expect.arrayContaining(["normal", "freeedit"]));
            expect(r.advancePresent, `[${r.type}] advance offered iff character`)
                .toBe(r.type === "character");
            expect(r.selectedValue, `[${r.type}] default selected is normal`).toBe("normal");
        }
    });

    test("description prose-mirror contenteditable is reachable to clicks (#54)", async ({page}) => {
        // Foundry's <prose-mirror> uses an absolutely-positioned toolbar, so
        // .menu-container has 0 layout height. Without a flex chain the
        // .editor-content collapses to its content height (~30px) while
        // floating toolbar buttons overlay the rest of the prose-mirror box,
        // intercepting clicks meant for the contenteditable area. Assert
        // that elementFromPoint at the center of .editor-content actually
        // lands inside .editor-content (and isn't a BUTTON).
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            // bindPrimaryTabs reads tabGroups.primary off the *sheet* app
            // instance, not the actor document. Set it on the sheet before
            // first render so the biography tab is the active one and the
            // description prose-mirrors are visible (non-zero rects).
            const sheet: any = actor.sheet;
            (sheet.tabGroups ??= {}).primary = "description";
            await sheet.render(true);
            await new Promise((r) => setTimeout(r, 400));

            const root = sheet.element as HTMLElement;
            // Sanity: confirm the biography tab is actually the active pane.
            // If not, the rest of the test would silently pass vacuously
            // because hidden tabs have zero-sized descendants.
            const activeTab = root.querySelector(".sheet-body > .tab.active") as HTMLElement | null;
            const activeTabName = activeTab?.dataset.tab ?? null;
            // The biography tab stacks several prose-mirror editors in a
            // scrollable .sheet-body. Hit-test only the editors whose center
            // lies inside the visible scroll viewport — `elementFromPoint`
            // returns null for points outside the viewport, which would
            // false-positive a "clicks blocked" failure.
            const sheetBody = root.querySelector("section.sheet-body") as HTMLElement | null;
            const bodyRect = sheetBody?.getBoundingClientRect();
            const pms = [...root.querySelectorAll("prose-mirror")] as HTMLElement[];
            const out = pms.map((pm) => {
                const ec = pm.querySelector(".editor-content") as HTMLElement | null;
                if (!ec) return {hasEditor: false, visible: false};
                const r = ec.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) {
                    return {hasEditor: true, visible: false, height: r.height, hitInside: false, hitTag: "(zero-rect)"};
                }
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const visible = !!bodyRect && cy >= bodyRect.top && cy <= bodyRect.bottom;
                if (!visible) {
                    return {hasEditor: true, visible: false, height: r.height, hitInside: false, hitTag: "(off-viewport)"};
                }
                const top = document.elementFromPoint(cx, cy);
                return {
                    hasEditor: true,
                    visible: true,
                    height: r.height,
                    hitInside: !!top && ec.contains(top),
                    hitTag: top?.tagName ?? "(none)",
                };
            });
            await sheet.close();
            return {activeTabName, editors: out};
        });

        // Pin the precondition so a future change to the tab plumbing can't
        // turn this into a vacuous pass (hidden tabs have zero rects, which
        // the .height filter would silently drop).
        expect(result.activeTabName, "biography tab is the active pane").toBe("description");

        // Description tab must render at least one prose-mirror with a sized
        // editor-content whose center belongs to the editor. Only test the
        // editors visible in the current scroll viewport — off-screen ones
        // would falsely fail because `elementFromPoint` is null outside it.
        const usable = result.editors.filter((r) => r.hasEditor && r.visible && r.height && r.height > 0);
        expect(usable.length, "at least one visible prose-mirror has a sized editor-content").toBeGreaterThan(0);
        for (const r of usable) {
            expect(r.height, "editor-content fills more than one line").toBeGreaterThan(60);
            expect(r.hitInside, `clicks land inside editor-content (got ${r.hitTag})`).toBe(true);
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

    // Regression for #159: user reported that renaming a character AND
    // editing the biography on the sheet "reset" the sheet. Hypothesis
    // space includes upstream foundryvtt#13605 (PM in source mode drops
    // edits on submit) and any partial submit on our side that overwrites
    // unrelated system fields. These tests isolate the data layer (our
    // TypeDataModel + actor update path) from the DOM/PM-submit layer
    // (Foundry-controlled): if the data-layer test passes, the bug is in
    // Foundry's PM/form pipeline, not in our system.
    test("name + biography update via API preserves unrelated system fields (#159)", async ({page}) => {
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            // Seed unrelated system fields. If the name+bio update clobbers
            // the parent system object instead of patching, these get reset.
            await actor.update({
                name: "smoke-persist",
                system: {
                    characterpoints: {value: 7},
                    fatepoints: {value: 3},
                    metaphysicsextranormal: {value: true},
                    gender: {content: "seed-gender"},
                    description: {content: ""},
                    personality: {content: ""},
                },
            });

            // Combined name + biography update — same shape Foundry's
            // submitOnChange would produce when both inputs change in one
            // submit cycle.
            await actor.update({
                name: "smoke-persist-bio-rename",
                system: {
                    description: {content: "<p>edited bio body</p>"},
                    personality: {content: "<p>edited personality</p>"},
                },
            });

            const after = window.game.actors.get(actor.id);
            return {
                name: after.name,
                description: after.system.description.content,
                personality: after.system.personality.content,
                characterpoints: after.system.characterpoints.value,
                fatepoints: after.system.fatepoints.value,
                metaphysics: after.system.metaphysicsextranormal.value,
                gender: after.system.gender.content,
            };
        });

        expect(result.name, "name change persisted").toBe("smoke-persist-bio-rename");
        expect(result.description, "description content persisted").toContain("edited bio");
        expect(result.personality, "personality content persisted").toContain("edited personality");
        expect(result.characterpoints, "characterpoints not reset by name+bio update").toBe(7);
        expect(result.fatepoints, "fatepoints not reset by name+bio update").toBe(3);
        expect(result.metaphysics, "metaphysics toggle not reset by name+bio update").toBe(true);
        expect(result.gender, "gender content not reset by name+bio update").toBe("seed-gender");
    });

    test("DOM rename via submitOnChange preserves unrelated system fields (#159)", async ({page}) => {
        // Drive the same path the user did for the name half: type in the
        // name input, let submitOnChange fire. Verifies the sheet's submit
        // pipeline doesn't blow away other system fields when only the
        // name input changes.
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            await actor.update({
                name: "smoke-persist",
                system: {
                    characterpoints: {value: 11},
                    fatepoints: {value: 4},
                    metaphysicsextranormal: {value: true},
                    description: {content: "<p>seed bio</p>"},
                    personality: {content: "<p>seed personality</p>"},
                    background: {content: "<p>seed background</p>"},
                    gender: {content: "seed-gender"},
                },
            });

            const sheet: any = actor.sheet;
            await sheet.render(true);
            await new Promise((r) => setTimeout(r, 400));

            const nameInput = sheet.element.querySelector('input[name="name"]') as HTMLInputElement;
            nameInput.value = "dom-renamed";
            nameInput.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 800));

            const after = window.game.actors.get(actor.id);
            const snapshot = {
                name: after.name,
                description: after.system.description.content,
                personality: after.system.personality.content,
                background: after.system.background.content,
                characterpoints: after.system.characterpoints.value,
                fatepoints: after.system.fatepoints.value,
                metaphysics: after.system.metaphysicsextranormal.value,
                gender: after.system.gender.content,
            };
            await sheet.close();
            return snapshot;
        });

        expect(result.name, "name change persisted").toBe("dom-renamed");
        expect(result.description, "description not reset by DOM rename").toContain("seed bio");
        expect(result.personality, "personality not reset by DOM rename").toContain("seed personality");
        expect(result.background, "background not reset by DOM rename").toContain("seed background");
        expect(result.characterpoints, "characterpoints not reset by DOM rename").toBe(11);
        expect(result.fatepoints, "fatepoints not reset by DOM rename").toBe(4);
        expect(result.metaphysics, "metaphysics toggle not reset by DOM rename").toBe(true);
        expect(result.gender, "gender content not reset by DOM rename").toBe("seed-gender");
    });

    test("rename while bio prose-mirror has unsaved draft does not blank stored bio (#159)", async ({page}) => {
        // Probe for the leading hypothesis on #159: user types into the bio
        // <prose-mirror> but has not clicked PM's own toolbar save when they
        // change the name input; submitOnChange fires; what does the form
        // submit harvest for the PM-bound fields?
        //
        // Acceptable outcomes:
        //   (a) stored description equals the pre-edit seed — PM submitted
        //       its committed value; the user's draft is dropped (a known
        //       Foundry quirk, not data loss).
        //   (b) stored description equals the typed draft — PM submitted
        //       its live editor content.
        //
        // The bug case this test guards against:
        //   (c) stored description is empty — PM submitted "" while there
        //       was real content both in the document and in the editor.
        //       That is the symptom owlsten reported as "the sheet was
        //       reset".
        await loginAndWaitReady(page);
        await ensureCharacter(page);

        const result = await evalInWorld(page, async () => {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-persist");
            const SEED_DESC = "<p>seed-description-body</p>";
            const SEED_PERS = "<p>seed-personality-body</p>";
            const SEED_BG = "<p>seed-background-body</p>";
            await actor.update({
                name: "smoke-persist",
                system: {
                    characterpoints: {value: 9},
                    description: {content: SEED_DESC},
                    personality: {content: SEED_PERS},
                    background: {content: SEED_BG},
                    gender: {content: "seed-gender"},
                },
            });

            const sheet: any = actor.sheet;
            // Land on biography tab so the PMs are mounted with non-zero rects.
            (sheet.tabGroups ??= {}).primary = "description";
            await sheet.render(true);
            await new Promise((r) => setTimeout(r, 500));

            const root = sheet.element as HTMLElement;
            const descPM = root.querySelector(
                'prose-mirror[name="system.description.content"]',
            ) as HTMLElement | null;
            const editor = descPM?.querySelector(".editor-content") as HTMLElement | null;
            if (!descPM || !editor) {
                await sheet.close();
                return {found: false};
            }

            // Simulate "user is mid-edit in PM": focus the contenteditable,
            // mutate its innerHTML, dispatch input. We do NOT click the PM's
            // own save button. This mirrors typing into bio without leaving
            // the editor.
            editor.focus();
            editor.innerHTML = "<p>typed-draft-but-not-saved</p>";
            editor.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));
            await new Promise((r) => setTimeout(r, 100));

            // Snapshot what the PM's form-facing value attribute holds *before*
            // the rename submit — useful for diagnosing which value the form
            // serialization picks up.
            const pmValueAttrBefore = (descPM as any).getAttribute?.("value") ?? null;

            // Now drive the name change. submitOnChange fires; the whole form
            // is harvested, including all three PMs.
            const nameInput = root.querySelector('input[name="name"]') as HTMLInputElement;
            nameInput.value = "rename-during-bio-draft";
            nameInput.dispatchEvent(new Event("change", {bubbles: true}));
            await new Promise((r) => setTimeout(r, 1200));

            const after = window.game.actors.get(actor.id);
            const snapshot = {
                found: true,
                pmValueAttrBefore,
                name: after.name,
                description: after.system.description.content,
                personality: after.system.personality.content,
                background: after.system.background.content,
                characterpoints: after.system.characterpoints.value,
                gender: after.system.gender.content,
                seedDesc: SEED_DESC,
                seedPers: SEED_PERS,
                seedBg: SEED_BG,
            };
            await sheet.close();
            return snapshot;
        });

        if (!result.found) {
            test.skip(true, "description prose-mirror not present on the rendered sheet");
            return;
        }

        // Hard assertions — the bug case (#159 hypothesis).
        expect(result.name, "name change persisted").toBe("rename-during-bio-draft");
        expect(result.description, "description must not be blanked by submit during bio draft")
            .not.toBe("");
        expect(result.description, "description must not collapse to an empty PM doc")
            .not.toMatch(/^<p>(<br\s*\/?>)?<\/p>$/);
        expect(result.personality, "personality (untouched PM) must survive the rename submit")
            .toBe(result.seedPers);
        expect(result.background, "background (untouched PM) must survive the rename submit")
            .toBe(result.seedBg);
        expect(result.characterpoints, "unrelated numeric field survives rename + bio-draft").toBe(9);
        expect(result.gender, "unrelated text field survives rename + bio-draft").toBe("seed-gender");

        // Soft characterization — log which of (a) committed seed vs.
        // (b) live draft the form actually submitted, so a future failure
        // here surfaces a behavior change in Foundry's PM form serialization.
        const tookSeed = result.description === result.seedDesc;
        const tookDraft = result.description?.includes("typed-draft-but-not-saved");
        // eslint-disable-next-line no-console
        console.log("[#159 PM-mid-edit probe]", {
            tookSeed, tookDraft,
            descriptionAfter: result.description,
            pmValueAttrBefore: result.pmValueAttrBefore,
        });
        expect(tookSeed || tookDraft,
            "description after rename is either committed seed or typed draft, not unrelated content")
            .toBe(true);
    });
});
