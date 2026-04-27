/**
 * Global teardown — fires once after all smoke specs complete. Connects
 * to the test world and removes any `smoke-*` actor/item documents the
 * specs may have left behind.
 */

import {chromium, FullConfig} from "@playwright/test";
import {loginAndWaitReady} from "./helpers/foundry-page.js";

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
    const browser = await chromium.launch();
    const context = await browser.newContext({baseURL: FOUNDRY_URL});
    const page = await context.newPage();
    try {
        await loginAndWaitReady(page);
        const removed = await page.evaluate(async () => {
            const actorIds = window.game.actors
                .filter((a: any) => a.name?.startsWith("smoke-"))
                .map((a: any) => a.id);
            const itemIds = window.game.items
                .filter((i: any) => i.name?.startsWith("smoke-"))
                .map((i: any) => i.id);
            await window.Actor.deleteDocuments(actorIds);
            await window.Item.deleteDocuments(itemIds);
            // also nuke any leftover test-scene
            const sceneIds = window.game.scenes
                .filter((s: any) => s.name === "test-scene")
                .map((s: any) => s.id);
            await window.Scene.deleteDocuments(sceneIds);
            return {actors: actorIds.length, items: itemIds.length, scenes: sceneIds.length};
        });
        // eslint-disable-next-line no-console
        console.log(`[smoke teardown] removed ${removed.actors} actors, ${removed.items} items, ${removed.scenes} scenes`);
    } catch (e) {
        // Don't fail the suite if teardown can't connect; just warn
        // eslint-disable-next-line no-console
        console.warn(`[smoke teardown] skipped: ${(e as Error).message}`);
    } finally {
        await browser.close();
    }
}
