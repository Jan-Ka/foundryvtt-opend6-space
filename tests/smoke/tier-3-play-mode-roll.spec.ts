/**
 * Tier 3 — Roll-from-sheet works in PLAY mode (regression for issue #76).
 *
 * V2 ActorSheets render in PLAY mode by default, where `isEditable` is
 * false. Previously, _onRender early-returned on !isEditable and never
 * bound the .rolldialog click handler — so non-GM players (whose sheets
 * default to PLAY mode) silently failed to roll. This spec opens the
 * sheet, forces it into PLAY mode, and verifies clicking a .rolldialog
 * skill row still opens the RollDialog.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("rolldialog click opens RollDialog while sheet is in PLAY mode", async ({page}) => {
    await loginAndWaitReady(page);

    await evalInWorld(page, async () => {
        let actor = window.game.actors.find((a: any) => a.name === "smoke-character");
        if (!actor) {
            actor = await window.Actor.create({name: "smoke-character", type: "character"}, {render: false});
        }
        if (!actor.items.find((i: any) => i.type === "skill" && i.name === "smoke-skill")) {
            await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-skill",
                type: "skill",
                system: {score: 3, attribute: "agi"},
            }]);
        }
    });

    const result = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) =>
            errs.push("rej: " + (e.reason?.message ?? String(e.reason)));
        window.addEventListener("unhandledrejection", onRej);

        try {
            const actor = window.game.actors.find((a: any) => a.name === "smoke-character");

            // Force PLAY mode (the V2 default for non-GM owners).
            const SHEET_MODES = (window.foundry as any).applications.sheets
                ?.DocumentSheetV2?.SHEET_MODES ?? {PLAY: 1, EDIT: 2};
            actor.sheet._mode = SHEET_MODES.PLAY;

            await actor.sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const root = actor.sheet.element as HTMLElement;
            const isEditable = actor.sheet.isEditable;

            // Find the .rolldialog element for our skill (any will do — the
            // bug was that none of them were bound).
            const rollEl = root.querySelector<HTMLElement>(".rolldialog");
            const rollElFound = !!rollEl;

            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            rollEl?.click();
            await new Promise((r) => setTimeout(r, 400));

            const dlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );

            if (dlg) { try { await (dlg as any).close(); } catch { /* ignore */ } }
            try { await actor.sheet.close(); } catch { /* ignore */ }

            window.removeEventListener("unhandledrejection", onRej);
            return {isEditable, rollElFound, dialogOpened: !!dlg, errs};
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {
                isEditable: null, rollElFound: false, dialogOpened: false,
                errs: [(e as Error).message],
            };
        }
    });

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.rollElFound, ".rolldialog element rendered").toBe(true);
    // Confirms we actually exercised the bug path: sheet was non-editable.
    expect(result.isEditable, "sheet was in PLAY mode (isEditable false)").toBe(false);
    expect(result.dialogOpened, "RollDialog opened from PLAY-mode click").toBe(true);
});
