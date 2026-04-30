/**
 * Foundry setup-flow driver.
 *
 * State machine over the four pages Foundry can land on when Playwright
 * navigates to "/":
 *
 *   /auth   — admin password gate. Submit FOUNDRY_ADMIN_KEY (or empty).
 *   /setup  — world manager. Either launch our smoke world if it exists,
 *             or create + launch one if it doesn't.
 *   /join   — world is launched, awaiting a user pick. Caller takes over.
 *   /game   — world is launched and a session is open. Caller takes over.
 *
 * Idempotent: cheap when the smoke world is already launched, ~5–10 s when
 * it has to provision from scratch.
 *
 * Safety: refuses to launch or interact with a different world than the
 * one we expect. A developer running their personal campaign on the same
 * Foundry instance will see a clear error rather than have their world
 * trampled.
 *
 * Tested against Foundry v14. The DOM selectors live here intentionally
 * — when Foundry redesigns the setup UI on a major version bump, the
 * fix is one file. See SELECTORS below.
 */

import {Page} from "@playwright/test";

/**
 * Selectors for the setup screens. Update these in one place when a
 * Foundry version bump moves things around. The shape of these queries
 * is intentionally forgiving (multiple `, ` alternates) so a class or
 * attribute rename in Foundry doesn't immediately break the suite.
 */
const SELECTORS = {
    auth: {
        passwordInput: 'input[name="adminKey"], input[type="password"]',
        submit: 'button[type="submit"], button[name="adminKey"]',
    },
    setup: {
        // Tile / row representing a world. v14 uses data-package-id; older
        // releases used data-world-id. Accept both.
        worldTile: (id: string) =>
            `li.package.world[data-package-id="${id}"], [data-world-id="${id}"]`,
        worldLaunch: 'a[data-action="worldLaunch"], button[data-action="worldLaunch"]',
        // "Create World" entry in the worlds tab toolbar
        createWorldButton: 'button[data-action="worldCreate"]',
        // The create-world dialog (form#world-create on v14)
        worldForm: 'form#world-create',
        worldIdInput: 'form#world-create input[name="world-id"]',
        worldTitleInput: 'form#world-create input[name="title"]',
        worldSystemSelect: 'form#world-create select[name="system"]',
        worldFormSubmit: 'form#world-create button[type="submit"]',
    },
};

export interface EnsureWorldOptions {
    /** World id (folder name) we expect — defaults to FOUNDRY_SMOKE_WORLD or `od6s-smoke`. */
    worldId: string;
    /** System id to use when creating the world from scratch. */
    system: string;
    /**
     * Foundry server admin key (`FOUNDRY_ADMIN_KEY`); empty if Foundry
     * runs without one. Same convention as the project's `.env.example`
     * and the `task foundry:start` Taskfile recipe.
     */
    adminKey?: string;
    /** Logging hook for orchestration trace. */
    log?: (msg: string) => void;
}

/**
 * Drive Foundry from wherever it is now to "world launched, ready for
 * loginAndWaitReady". Throws with an actionable message on every
 * failure mode the developer can fix.
 */
export async function ensureWorldLaunched(
    page: Page,
    opts: EnsureWorldOptions,
): Promise<void> {
    const log = opts.log ?? (() => {});
    const adminKey = opts.adminKey ?? "";
    if (!adminKey) {
        log(
            `[setup-driver] FOUNDRY_ADMIN_KEY is empty — will only succeed if ` +
            `Foundry has no admin password configured.`,
        );
    }

    // Cap iterations so a misbehaving Foundry can't spin us forever.
    const MAX_HOPS = 6;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
        // `networkidle`, not `domcontentloaded` — Foundry's setup pages
        // render forms via JS into <template> elements after the initial
        // HTML lands, so domcontentloaded is too early.
        await page.goto("/", {waitUntil: "networkidle"});
        const url = page.url();
        log(`[setup-driver] hop ${hop}: ${url}`);

        if (url.includes("/auth")) {
            await driveAuth(page, adminKey);
            continue;
        }

        if (url.includes("/setup")) {
            await driveSetup(page, opts);
            continue;
        }

        if (url.includes("/join") || url.includes("/game")) {
            // World is up — the caller's loginAndWaitReady will verify
            // it's the world we expect via the world-id assertion.
            log(`[setup-driver] world launched`);
            return;
        }

        throw new Error(
            `[setup-driver] unexpected page ${url} (no /auth, /setup, /join, or /game)`,
        );
    }
    throw new Error(`[setup-driver] gave up after ${MAX_HOPS} hops`);
}

async function driveAuth(page: Page, adminKey: string): Promise<void> {
    const input = page.locator(SELECTORS.auth.passwordInput).first();
    try {
        await input.waitFor({state: "visible", timeout: 10_000});
    } catch {
        throw new Error(
            `[setup-driver] /auth page password input never rendered — selector drift?`,
        );
    }
    await input.fill(adminKey);
    await page.locator(SELECTORS.auth.submit).first().click();
    await page.waitForLoadState("networkidle");

    // Detect auth failure: Foundry stays on /auth and posts a notification.
    if (page.url().includes("/auth")) {
        const notif = await page
            .locator("#notifications .notification.error")
            .allTextContents()
            .catch(() => [] as string[]);
        const msg = notif.find((n) => /administrator password/i.test(n)) ?? notif[0];
        throw new Error(
            `[setup-driver] admin auth failed: ${msg ?? "(no notification text)"}\n` +
            `  → Set FOUNDRY_ADMIN_KEY to your Foundry server admin password.`,
        );
    }
}

async function driveSetup(page: Page, opts: EnsureWorldOptions): Promise<void> {
    // /setup renders its tabs and tiles after JS init. Wait for *something*
    // interactive to appear before deciding present-or-absent.
    await page.locator("button, [data-package-id]").first()
        .waitFor({state: "visible", timeout: 10_000})
        .catch(() => undefined);

    // Foundry shows onboarding tours over /setup on a fresh install (and
    // sometimes after upgrades). Their `tour-overlay` div intercepts
    // pointer events, so anything we click silently times out behind it.
    // Dismiss any tour we can see, in a loop — Foundry can chain them.
    await dismissTours(page);

    // Look for our world's tile. If present, launch it. If not, create.
    const tile = page.locator(SELECTORS.setup.worldTile(opts.worldId)).first();
    if (await tile.count()) {
        // Foundry v14 renders `.control.play` with `visibility: hidden` —
        // the buttons only un-hide on hover, and Playwright's actionability
        // check rejects clicks on hidden elements (hover/force don't help).
        // Dispatch the click via the DOM so it still flows through Foundry's
        // delegated `data-action="worldLaunch"` handler, which is what
        // actually invokes SetupApplication#launchWorld(pkg).
        const launchSelector = SELECTORS.setup.worldLaunch;
        const dispatched = await page.evaluate(
            ({worldId, selector}) => {
                const t = document.querySelector(
                    `li.package.world[data-package-id="${worldId}"], [data-world-id="${worldId}"]`,
                );
                if (!t) return "no-tile";
                const btn = t.querySelector(selector) as HTMLElement | null;
                if (!btn) return "no-button";
                btn.click();
                return "clicked";
            },
            {worldId: opts.worldId, selector: launchSelector},
        );
        if (dispatched !== "clicked") {
            throw new Error(
                `[setup-driver] could not dispatch worldLaunch for "${opts.worldId}": ${dispatched}`,
            );
        }

        // SetupApplication#launchWorld opens a DialogV2 migration prompt
        // when the world's coreVersion or systemVersion lags Foundry's.
        // Confirm it. If the world is up-to-date, the dialog never
        // appears and waitForURL fires first.
        await Promise.race([
            confirmMigrationIfShown(page),
            page.waitForURL(/\/(join|game)\b/, {timeout: 60_000}).catch(() => undefined),
        ]);
        // Either path eventually navigates away from /setup; wait for it.
        await page.waitForURL(/\/(join|game)\b/, {timeout: 60_000});
        return;
    }

    await createWorld(page, opts);
}

/**
 * After a worldLaunch click, Foundry may open a DialogV2 confirmation
 * prompt (`SETUP.WorldMigrationRequiredTitle`) if the world's
 * coreVersion or systemVersion lags Foundry's. Click "Yes" so the
 * launch can proceed. No-op when the dialog never appears (world is
 * already current); resolves once the dialog is gone or after a short
 * timeout — the caller wraps this in a Promise.race against the
 * happy-path navigation, so a missing dialog is fine.
 */
async function confirmMigrationIfShown(page: Page): Promise<void> {
    // DialogV2 in v14 renders as `<dialog class="dialog ...">` with a
    // `.form-footer` containing the yes/no buttons. The "yes" button has
    // `data-action="yes"`. Wait briefly for it to appear.
    const yesBtn = page.locator(
        'dialog.dialog button[data-action="yes"], dialog button[data-action="yes"]',
    ).first();
    try {
        await yesBtn.waitFor({state: "visible", timeout: 5_000});
    } catch {
        return; // no dialog — happy path
    }
    await yesBtn.click({force: true});
}

async function dismissTours(page: Page): Promise<void> {
    for (let i = 0; i < 5; i++) {
        const exit = page.locator('aside.tour a.step-button[data-action="exit"]').first();
        if (!(await exit.count())) return;
        await exit.click({timeout: 3_000}).catch(() => undefined);
        await page.waitForTimeout(200);
    }
}

async function createWorld(page: Page, opts: EnsureWorldOptions): Promise<void> {
    const createBtn = page.locator(SELECTORS.setup.createWorldButton).first();
    if (!(await createBtn.count())) {
        throw new Error(
            `[setup-driver] cannot find "Create World" control on /setup. ` +
            `Either Foundry's UI moved (update SELECTORS in setup-driver.ts) ` +
            `or you're on a screen where world creation is disabled.`,
        );
    }
    await createBtn.click();

    // The create-world form usually opens in a dialog/sheet. Fields appear
    // in the same DOM (Foundry doesn't iframe its dialogs).
    await page.locator(SELECTORS.setup.worldIdInput).first().waitFor({timeout: 10_000});

    await page.locator(SELECTORS.setup.worldIdInput).first().fill(opts.worldId);
    await page.locator(SELECTORS.setup.worldTitleInput).first().fill(opts.worldId);

    const systemSelect = page.locator(SELECTORS.setup.worldSystemSelect).first();
    // Two value formats Foundry has used: bare id ("od6s") or package id
    // ("od6s.od6s"). Try the bare id first; fall back to label match.
    try {
        await systemSelect.selectOption({value: opts.system});
    } catch {
        await systemSelect.selectOption({label: opts.system});
    }

    await page.locator(SELECTORS.setup.worldFormSubmit).first().click();

    // After creation Foundry usually returns to /setup with the new tile
    // present. Re-enter the loop to launch it.
    await page.waitForLoadState("domcontentloaded");
}
