/**
 * Tier 3 — #85 schema-version stamping.
 *
 * Verifies:
 *   - new actors/items get `system._systemSchemaVersion` stamped from
 *     `_preCreate` against `game.system.version`;
 *   - a synthetically downlevel actor logs a `[nonex-ist-od6s:schema-version]`
 *     warning to the console on next `prepareData`.
 *
 * The notification side of the warn is GM-visible; we don't assert on
 * `ui.notifications` here because it sticks across tests on the same world
 * — console output is the deterministic check.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("new actors are stamped with the running system version on create", async ({page}) => {
    await loginAndWaitReady(page);

    const r = await evalInWorld(page, async () => {
        const actor = await window.Actor.create(
            {name: "smoke-schema-version-create", type: "character"},
            {render: false},
        );
        const stamp = actor.system._systemSchemaVersion;
        await actor.delete();
        return {stamp, current: window.game.system.version};
    });

    expect(r.stamp).toBe(r.current);
});

test("downlevel actor stamp triggers a console warn from prepareData", async ({page}) => {
    const messages: string[] = [];
    page.on("console", msg => {
        if (msg.type() === "warning") messages.push(msg.text());
    });

    await loginAndWaitReady(page);

    await evalInWorld(page, async () => {
        let actor = window.game.actors.find(
            (a: any) => a.name === "smoke-schema-version-lag",
        );
        if (!actor) {
            actor = await window.Actor.create(
                {name: "smoke-schema-version-lag", type: "character"},
                {render: false},
            );
        }
        // Force the stamp to a clearly older version, then re-prepare.
        await actor.update({"system._systemSchemaVersion": "0.1.0"});
        actor.prepareData();
    });

    const lagWarn = messages.find(m =>
        m.includes("[nonex-ist-od6s:schema-version]") && m.includes("stamped 0.1.0"),
    );
    expect(lagWarn, `expected schema-version lag warn, got:\n${messages.join("\n")}`)
        .toBeTruthy();
});
