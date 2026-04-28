/**
 * Global setup — fires once before any smoke spec runs.
 *
 * Two responsibilities:
 *
 *   1. Probe — fail fast with an actionable message if Foundry isn't
 *      reachable. Without this, every spec burns 30 s waiting for
 *      `game.ready` on a process that isn't running.
 *
 *   2. Provision — drive Foundry's setup flow (`/auth`, `/setup`) so
 *      the smoke suite always runs against a known world. If our smoke
 *      world doesn't exist, create it; if it exists but isn't launched,
 *      launch it; if it's already launched, attach.
 *
 * Specs verify world identity via `loginAndWaitReady` (which asserts
 * `game.world.id === FOUNDRY_SMOKE_WORLD`) so a misconfigured run can't
 * silently mutate someone's personal campaign.
 */

import {chromium, FullConfig} from "@playwright/test";
import {ensureWorldLaunched} from "./helpers/setup-driver.js";

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";
const FOUNDRY_ADMIN_KEY = process.env.FOUNDRY_ADMIN_KEY ?? "";
const FOUNDRY_SMOKE_WORLD = process.env.FOUNDRY_SMOKE_WORLD ?? "od6s-smoke";
const FOUNDRY_SYSTEM_ID = process.env.FOUNDRY_SYSTEM_ID ?? "od6s";
const PROBE_TIMEOUT_MS = 10_000;

class SmokePreconditionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SmokePreconditionError";
    }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
    const browser = await chromium.launch();
    const context = await browser.newContext({baseURL: FOUNDRY_URL});
    const page = await context.newPage();
    try {
        // Reachability check — distinguishes "Foundry not running" from
        // "Foundry running but stuck".
        try {
            const response = await page.goto("/", {timeout: PROBE_TIMEOUT_MS});
            if (!response || !response.ok()) {
                throw new SmokePreconditionError(
                    `Foundry at ${FOUNDRY_URL} returned ${response?.status() ?? "no response"}.\n` +
                    `  → Check that the Foundry process is healthy.`,
                );
            }
        } catch (e) {
            if (e instanceof SmokePreconditionError) throw e;
            const msg = (e as Error).message.split("\n")[0];
            throw new SmokePreconditionError(
                `Cannot reach Foundry at ${FOUNDRY_URL} (${msg}).\n` +
                `  → Start your Foundry server on the configured port, or set FOUNDRY_URL.`,
            );
        }

        // Drive setup → world launched. ensureWorldLaunched is idempotent;
        // a re-run with the world already up is a single page load.
        await ensureWorldLaunched(page, {
            worldId: FOUNDRY_SMOKE_WORLD,
            system: FOUNDRY_SYSTEM_ID,
            adminKey: FOUNDRY_ADMIN_KEY,
            log: (msg) => console.log(msg),
        });
    } finally {
        await browser.close();
    }
}
