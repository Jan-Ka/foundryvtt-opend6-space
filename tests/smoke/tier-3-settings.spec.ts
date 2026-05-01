/**
 * Tier 3a — Settings forms.
 *
 * Renders every system settings menu and verifies the form mounts
 * with a <form> element. Catches V2 migration regressions.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("every od6s settings form renders with a <form>", async ({page}) => {
    await loginAndWaitReady(page);
    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const opened: any[] = [];
        const menus = [...window.game.settings.menus.entries()]
            .filter(([k]) => k.startsWith("od6s."))
            .map(([k, v]) => ({key: k, type: (v as any).type}));

        for (const m of menus) {
            try {
                const inst = new m.type();
                await inst.render(true);
                opened.push(inst);
                await new Promise((r) => setTimeout(r, 80));
                const root = inst.element;
                // V2 wraps the root element as <form> when tag:"form"; either
                // a descendant <form> or a root form-tagged element counts.
                const hasForm =
                    !!root?.querySelector?.("form") ||
                    root?.tagName?.toLowerCase() === "form";
                if (!hasForm) errs.push(`${m.key}: no <form> element`);
            } catch (e) {
                errs.push(`${m.key}: ${(e as Error).message}`);
            }
        }

        await new Promise((r) => setTimeout(r, 300));
        for (const i of opened) {
            try {
                await i.close();
            } catch {
                // ignore
            }
        }

        return {opened: opened.length, total: menus.length, errs, keys: menus.map((m) => m.key)};
    });

    expect(result.errs, "settings form errors").toEqual([]);
    expect(result.opened).toBe(result.total);
    expect(result.total).toBeGreaterThan(0);
});

test("sheet_background_opacity drives --od6s-sheet-opacity CSS var (#31)", async ({page}) => {
    await loginAndWaitReady(page);

    const result = await evalInWorld(page, async () => {
        const initial = window.game.settings.get("od6s", "sheet_background_opacity") as number;
        const initialVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--od6s-sheet-opacity").trim();

        await window.game.settings.set("od6s", "sheet_background_opacity", 0.25);
        await new Promise((r) => setTimeout(r, 100));
        const lowVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--od6s-sheet-opacity").trim();

        await window.game.settings.set("od6s", "sheet_background_opacity", 1.75);
        await new Promise((r) => setTimeout(r, 100));
        const highVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--od6s-sheet-opacity").trim();

        // Restore default so other specs aren't affected.
        await window.game.settings.set("od6s", "sheet_background_opacity", 1);

        const setting = window.game.settings.settings.get("od6s.sheet_background_opacity") as any;
        return {
            initial,
            initialVar,
            lowVar,
            highVar,
            range: setting?.range,
            type: setting?.type?.name,
            scope: setting?.scope,
        };
    });

    expect(result.type, "setting type is Number").toBe("Number");
    expect(result.scope, "setting is per-client").toBe("client");
    expect(result.range, "setting renders as a slider").toEqual({min: 0, max: 2, step: 0.05});
    expect(result.initialVar, "default applies CSS var = 1 on init").toBe("1");
    expect(parseFloat(result.lowVar)).toBeCloseTo(0.25, 5);
    expect(parseFloat(result.highVar)).toBeCloseTo(1.75, 5);
});
