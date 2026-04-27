/**
 * Tier 3d — Combat & initiative.
 *
 * Creates a transient scene + combat with the smoke-character, rolls
 * initiative, then tears it all down. Verifies combat hooks fire
 * without errors.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("combat creation, combatant add, init roll, teardown", async ({page}) => {
    await loginAndWaitReady(page);

    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
    });

    const result = await evalInWorld(page, async () => {
        const out: any = {};
        try {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            let scene = window.game.scenes.active;
            const createdScene = !scene;
            if (!scene) {
                scene = await window.Scene.create({name: "test-scene", active: true});
            }
            let tokenDoc = scene.tokens.find((t: any) => t.actorId === actor.id);
            if (!tokenDoc) {
                const td = await actor.getTokenDocument({x: 100, y: 100});
                [tokenDoc] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
            }
            const combat = await window.Combat.create({scene: scene.id});
            await combat.activate();
            await combat.createEmbeddedDocuments("Combatant", [
                {tokenId: tokenDoc.id, actorId: actor.id, sceneId: scene.id},
            ]);
            out.combatants = combat.combatants.size;

            await combat.rollInitiative([combat.combatants.contents[0].id]);
            await new Promise((r) => setTimeout(r, 200));
            out.initRolled = combat.combatants.contents[0].initiative !== null;

            await combat.delete();
            if (createdScene) await scene.delete();
            out.cleanup = "ok";
        } catch (e) {
            out.err = (e as Error).message + "\n" + ((e as Error).stack?.split("\n").slice(0, 5).join("\n") ?? "");
        }
        return out;
    });

    expect(result.err).toBeUndefined();
    expect(result.combatants).toBe(1);
    expect(result.initRolled).toBe(true);
    expect(result.cleanup).toBe("ok");
});
