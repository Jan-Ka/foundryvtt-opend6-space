import {defineConfig, devices} from "@playwright/test";
import {existsSync} from "node:fs";
import {dirname, join} from "node:path";

// Load .env before reading any FOUNDRY_* env var. The file lives at the
// main repo root; from a `.claude/worktrees/<name>/` worktree, walk up to
// find it. Uses Node 24's built-in process.loadEnvFile (no dotenv dep).
function findEnvFile(start: string): string | undefined {
    let dir = start;
    while (dir !== dirname(dir)) {
        const candidate = join(dir, ".env");
        if (existsSync(candidate)) return candidate;
        dir = dirname(dir);
    }
    return undefined;
}
const envFile = findEnvFile(process.cwd());
if (envFile) process.loadEnvFile(envFile);

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

export default defineConfig({
    testDir: "./tests/smoke",
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    workers: 1,
    reporter: process.env.CI ? "list" : [["list"]],
    retries: 0,
    globalSetup: "./tests/smoke/global-setup.ts",
    globalTeardown: "./tests/smoke/global-teardown.ts",
    use: {
        baseURL: FOUNDRY_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
    },
    projects: [
        {
            name: "chromium",
            use: {...devices["Desktop Chrome"]},
        },
    ],
});
