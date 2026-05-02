/**
 * Tier 3 — Roll dialog cosmetic markup.
 *
 * Locks in the structural fixes applied to roll.html / metaphysicsRoll.html /
 * initRoll.html: no `class="column>"` typo, no bare `<div class="center"><b>`
 * section headers, dice indicators wrapped in .dice-suffix, cpcost styled
 * via class instead of inline color, and the submit button carrying the
 * .dialog-submit class.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("roll dialog renders with cosmetic fixes", async ({page}) => {
    await loginAndWaitReady(page);
    const result = await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-roll-cosmetic");
        if (actor) await actor.delete();
        actor = await window.Actor.create({
            name: "smoke-roll-cosmetic", type: "character",
            system: {attributes: {agi: {base: 10}}, characterpoints: {value: 5}},
        }, {render: false});
        const [skill] = await actor.createEmbeddedDocuments("Item", [{
            name: "Space Transports", type: "skill",
            system: {base: 12, attribute: "mec"},
        }]);

        // Open the roll dialog via skill.roll
        const apps0 = new Set([...window.foundry.applications.instances.keys()]);
        await skill.roll();
        await new Promise(r => setTimeout(r, 700));
        const dlg = [...window.foundry.applications.instances.values()].find(
            (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
        );
        if (!dlg) {
            await actor.delete();
            return {error: "dialog did not open"};
        }
        const root = (dlg as any).element as HTMLElement;
        const html = root.outerHTML;

        const hasColumnTypo = html.includes('class="column>"') || html.includes('class="column&gt;"');
        const hasOldCenterPattern = !!root.querySelector('div.center > b');
        const dialogSections = root.querySelectorAll('.dialog-section').length;
        const diceSuffixes = root.querySelectorAll('.dice-suffix').length;
        const cpcost = root.querySelector('.cpcost');
        const cpcostHasInlineColor = cpcost?.getAttribute("style")?.includes("color:") ?? false;
        const cpcostClass = cpcost?.className;
        const submit = root.querySelector('button[data-action="submit"]');
        const submitClass = submit?.className;
        const bonusPipsLabel = (root.querySelector('label[for="bonuspips"]') as HTMLElement)?.textContent?.trim();

        try { await (dlg as any).close(); } catch {}
        await actor.delete();
        return {
            hasColumnTypo, hasOldCenterPattern,
            dialogSections, diceSuffixes,
            cpcostHasInlineColor, cpcostClass,
            submitClass,
            bonusPipsLabel,
        };
    });
    console.log("[probe-cosmetic]", JSON.stringify(result, null, 2));
    expect(result.error).toBeUndefined();
    expect(result.hasColumnTypo, "no class=\"column>\" typo").toBe(false);
    expect(result.hasOldCenterPattern, "no <div.center><b> pattern").toBe(false);
    expect(result.dialogSections, "Penalties + Modifiers as .dialog-section").toBeGreaterThanOrEqual(2);
    expect(result.diceSuffixes, "all 4 penalty Ds wrapped in .dice-suffix").toBeGreaterThanOrEqual(4);
    expect(result.cpcostHasInlineColor, "no inline color on cpcost").toBe(false);
    expect(result.cpcostClass, "cpcost has cpcost-{color} class").toContain("cpcost-");
    expect(result.submitClass, "Roll button has dialog-submit class").toContain("dialog-submit");
    expect(result.bonusPipsLabel, "Bonus Pips label has no trailing +").not.toMatch(/\+$/);
});
