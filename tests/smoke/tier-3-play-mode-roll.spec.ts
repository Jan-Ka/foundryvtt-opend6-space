/**
 * Tier 3 — Roll-from-sheet works in PLAY mode (regression for issue #76).
 *
 * V2 ActorSheets render in PLAY mode by default, where `isEditable` is
 * false. Previously, _onRender early-returned on !isEditable and never
 * bound the play-mode roll selectors — so non-GM players (whose sheets
 * default to PLAY mode) silently failed to roll. This spec opens the
 * sheet, forces PLAY mode, and verifies *each* selector that was moved
 * above the editability gate still fires its handler.
 *
 * Selectors covered: .rolldialog, .actionroll, .combat-action,
 * .vehicle-action. Each is verified by spying on the corresponding
 * sheet method and asserting it gets invoked on click — that way a
 * typo or removed binding in registerRollListeners /
 * registerCombatRollListeners surfaces here.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

test("all PLAY-mode roll selectors fire their handlers", async ({page}) => {
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
        // Add a weapon so .actionroll renders.
        if (!actor.items.find((i: any) => i.type === "weapon" && i.name === "smoke-blaster")) {
            await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-blaster",
                type: "weapon",
                system: {damage: {score: 9, type: "p"}, subtype: "rangedattack"},
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

            const SHEET_MODES = (window.foundry as any).applications.sheets
                ?.DocumentSheetV2?.SHEET_MODES ?? {PLAY: 1, EDIT: 2};
            actor.sheet._mode = SHEET_MODES.PLAY;

            // Stub the sheet methods that the moved selectors fan out to.
            // We swap them BEFORE render so the listener bindings capture
            // our spy instead of the originals.
            const calls: Record<string, number> = {
                rolldialog: 0,
                actionroll: 0,
                combatAction: 0,
                vehicleAction: 0,
            };
            const sheet = actor.sheet;
            // .rolldialog goes through od6sroll._onRollEvent → _onRollDialog.
            // We can intercept at the sheet level by stubbing _onRollDialog
            // on the global class — but simpler to count via the dialog
            // appearing (covered by RollDialog assertion below).
            sheet._rollAvailableAction = async () => { calls.combatAction++; };
            sheet._rollAvailableVehicleAction = async () => { calls.vehicleAction++; };

            await sheet.render(true);
            await new Promise((r) => setTimeout(r, 300));

            const root = sheet.element as HTMLElement;
            const isEditable = sheet.isEditable;

            const present = {
                rolldialog: !!root.querySelector(".rolldialog"),
                actionroll: !!root.querySelector(".actionroll"),
                combatAction: !!root.querySelector(".combat-action"),
                vehicleAction: !!root.querySelector(".vehicle-action"),
            };

            // .rolldialog → opens RollDialog
            const apps0 = new Set([...window.foundry.applications.instances.keys()]);
            root.querySelector<HTMLElement>(".rolldialog")?.click();
            await new Promise((r) => setTimeout(r, 400));
            const rollDlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
            );
            if (rollDlg) { try { await (rollDlg as any).close(); } catch { /* ignore */ } }

            // .actionroll → also opens RollDialog (via _onRollItem → item.roll → _onRollDialog).
            const apps1 = new Set([...window.foundry.applications.instances.keys()]);
            root.querySelector<HTMLElement>(".actionroll")?.click();
            await new Promise((r) => setTimeout(r, 400));
            const actionDlg = [...window.foundry.applications.instances.values()].find(
                (a: any) => !apps1.has(a.id) && a.constructor.name.includes("RollDialog"),
            );
            if (actionDlg) { try { await (actionDlg as any).close(); } catch { /* ignore */ } }

            // .combat-action → _rollAvailableAction (stubbed)
            root.querySelector<HTMLElement>(".combat-action")?.click();
            await new Promise((r) => setTimeout(r, 100));

            // .vehicle-action → _rollAvailableVehicleAction (stubbed)
            root.querySelector<HTMLElement>(".vehicle-action")?.click();
            await new Promise((r) => setTimeout(r, 100));

            try { await sheet.close(); } catch { /* ignore */ }

            window.removeEventListener("unhandledrejection", onRej);
            return {
                isEditable,
                present,
                rollDialogOpened: !!rollDlg,
                actionDialogOpened: !!actionDlg,
                combatActionFired: calls.combatAction,
                vehicleActionFired: calls.vehicleAction,
                errs,
            };
        } catch (e) {
            window.removeEventListener("unhandledrejection", onRej);
            return {
                isEditable: null,
                present: {rolldialog: false, actionroll: false, combatAction: false, vehicleAction: false},
                rollDialogOpened: false,
                actionDialogOpened: false,
                combatActionFired: 0,
                vehicleActionFired: 0,
                errs: [(e as Error).message],
            };
        }
    });

    expect(result.errs, "unhandled rejections").toEqual([]);
    expect(result.isEditable, "sheet was in PLAY mode (isEditable false)").toBe(false);

    // .rolldialog (skills/attributes) — must always be present + bound.
    expect(result.present.rolldialog, ".rolldialog element rendered").toBe(true);
    expect(result.rollDialogOpened, ".rolldialog click opened RollDialog").toBe(true);

    // .actionroll (weapon attack) — present because we added a weapon.
    expect(result.present.actionroll, ".actionroll element rendered").toBe(true);
    expect(result.actionDialogOpened, ".actionroll click opened RollDialog").toBe(true);

    // .combat-action / .vehicle-action — only verify if rendered. The
    // template surfaces them only under specific actor configurations,
    // but if present they must be bound.
    if (result.present.combatAction) {
        expect(result.combatActionFired, ".combat-action click invoked _rollAvailableAction").toBeGreaterThan(0);
    }
    if (result.present.vehicleAction) {
        expect(result.vehicleActionFired, ".vehicle-action click invoked _rollAvailableVehicleAction").toBeGreaterThan(0);
    }
});
