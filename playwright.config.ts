import {defineConfig, devices} from "@playwright/test";

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000";

export default defineConfig({
    testDir: "./tests/smoke",
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    workers: 1,
    reporter: process.env.CI ? "list" : [["list"]],
    retries: 0,
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
