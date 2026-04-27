/**
 * Foundry-specific Playwright helpers.
 *
 * Connects to a running Foundry world (launched separately by the developer
 * or CI), logs in as the configured user, and waits for `game.ready`. The
 * smoke specs then call `evalInWorld()` to run their probes inside the
 * browser context — the same scripts that ship in docs/test-runbook.md.
 *
 * Configuration via env:
 *   FOUNDRY_URL       (default http://localhost:30000)
 *   FOUNDRY_USER      (default "Gamemaster")
 *   FOUNDRY_PASSWORD  (default "" — most dev worlds have no GM password)
 */

import {Page, expect} from "@playwright/test";

const USER = process.env.FOUNDRY_USER ?? "Gamemaster";
const PASSWORD = process.env.FOUNDRY_PASSWORD ?? "";

declare global {
    interface Window {
        game: any;
        ui: any;
        CONFIG: any;
        Actor: any;
        Item: any;
        Combat: any;
        Scene: any;
        ChatMessage: any;
        Hooks: any;
        Roll: any;
        foundry: any;
    }
}

/**
 * Navigate to the Foundry join page, pick the configured user, and wait
 * for `game.ready === true`. Idempotent: if the world is already loaded
 * (the page reports `game.ready`), this short-circuits.
 */
export async function loginAndWaitReady(page: Page): Promise<void> {
    await page.goto("/");
    // Foundry redirects to either /join (user select) or /game (loaded)
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    if (url.includes("/join")) {
        // user-select page
        await page.locator('select[name="userid"]').waitFor({state: "visible"});
        await page.selectOption('select[name="userid"]', {label: USER});
        if (PASSWORD) {
            await page.fill('input[name="password"]', PASSWORD);
        }
        await page.click('button[name="join"]');
    }

    // Wait for game.ready in the page context
    await page.waitForFunction(() => (window as any).game?.ready === true, null, {
        timeout: 30_000,
    });
}

/**
 * Run an arbitrary async function inside the world's page context. The
 * function receives no arguments and must return a JSON-serializable
 * result. Errors thrown inside propagate out to the test.
 *
 * Use this to run the same probe scripts the test runbook documents.
 */
export async function evalInWorld<T>(
    page: Page,
    fn: () => Promise<T> | T,
): Promise<T> {
    return await page.evaluate(fn);
}

/**
 * Assert there are no unexpected console errors during the bracketed
 * action. Use to gate sensitive flows where errors are silent.
 */
export async function expectNoConsoleErrors(
    page: Page,
    action: () => Promise<void>,
): Promise<void> {
    const errors: string[] = [];
    const onError = (msg: import("@playwright/test").ConsoleMessage) => {
        if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("console", onError);
    try {
        await action();
    } finally {
        page.off("console", onError);
    }
    expect(errors, "console errors during action").toEqual([]);
}
