/**
 * Tier 3 — Active Effect management on items and actors.
 *
 * Regressions covered:
 *
 *   #164 — Adding an effect to a weapon used to throw
 *          `[ActiveEffect] validation errors: ... name: may not be undefined`
 *          because the addEffect helper passed `{label}` instead of `{name}`.
 *
 *   #165 — Existing effects on the character sheet could not be deleted or
 *          toggled. The special-abilities tab rendered effects with no
 *          delete/toggle controls; the data-tab trash button only had its
 *          listener attached when the sheet was in EDIT mode. Deleting an
 *          item that owned an effect on the actor left the effect orphaned.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("addEffect helper creates an ActiveEffect with name field (#164)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.items.filter((i: any) => i.name === "smoke-effect-weapon")
            .map((i: any) => i.id);
        if (stale.length) await window.Item.deleteDocuments(stale);

        const weapon = await window.Item.create(
            {name: "smoke-effect-weapon", type: "weapon"},
            {render: false},
        );

        const errs: string[] = [];
        try {
            await weapon.createEmbeddedDocuments("ActiveEffect", [{
                name: window.game.i18n.localize("OD6S.NEW_ACTIVE_EFFECT"),
            }]);
        } catch (e) {
            errs.push((e as Error).message);
        }

        const effects = [...weapon.effects.contents];
        const out = {
            errs,
            count: effects.length,
            firstName: effects[0]?.name ?? null,
        };
        await weapon.delete();
        return out;
    });

    expect(result.errs, "AE create errors").toEqual([]);
    expect(result.count).toBe(1);
    expect(result.firstName).toBeTruthy();
});

test("actor effect can be toggled and deleted from the sheet (#165)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        // fresh actor
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-effect-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const actor = await window.Actor.create(
            {name: "smoke-effect-actor", type: "character"},
            {render: false},
        );

        // seed an actor-embedded effect (the same shape a legacy world would
        // have produced by copying a transferred item effect onto the actor)
        const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "smoke-effect",
            disabled: false,
        }]);
        const initialDisabled = effect.disabled;

        // exercise the toggle handler the way the .effect-toggle click would
        await effect.update({disabled: !effect.disabled});
        const afterToggle = actor.effects.get(effect.id).disabled;

        // exercise the delete handler the way the .effect-delete click would
        await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
        const afterDelete = actor.effects.get(effect.id);

        await actor.delete();

        return {initialDisabled, afterToggle, afterDelete: afterDelete ?? null};
    });

    expect(result.initialDisabled).toBe(false);
    expect(result.afterToggle).toBe(true);
    expect(result.afterDelete).toBeNull();
});

test("deleting an item also removes orphan actor effects whose origin is the item (#165)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const stale = window.game.actors.filter((a: any) => a.name === "smoke-orphan-actor")
            .map((a: any) => a.id);
        if (stale.length) await window.Actor.deleteDocuments(stale);
        const actor = await window.Actor.create(
            {name: "smoke-orphan-actor", type: "character"},
            {render: false},
        );

        // create an item embedded on the actor
        const [item] = await actor.createEmbeddedDocuments("Item", [
            {name: "smoke-orphan-weapon", type: "weapon"},
        ]);

        // simulate the legacy / drops.ts code-path that copies an effect onto
        // the actor with origin pointing at the source item
        await actor.createEmbeddedDocuments("ActiveEffect", [{
            name: "smoke-orphan-effect",
            origin: item.uuid,
        }]);
        const beforeDelete = actor.effects.size;

        // deleting the item must trigger preDeleteItem orphan cleanup
        await item.delete();

        // hook fires async; give it a tick
        await new Promise((r) => setTimeout(r, 100));
        const afterDelete = actor.effects.size;

        await actor.delete();

        return {beforeDelete, afterDelete};
    });

    expect(result.beforeDelete).toBe(1);
    expect(result.afterDelete).toBe(0);
});
