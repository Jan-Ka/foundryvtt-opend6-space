/**
 * Tier 3i — Auto-explosive resolution end-to-end.
 *
 * Automates the manual smoke protocol from PR #24 (closed #19) and the
 * keyed-pending-flag work in #40 / PR #116. The placement-preview UI is a
 * PIXI mouse-track + click-to-confirm flow that does not automate cleanly,
 * so we bypass it: pre-create a Region at a known position, pre-write the
 * `flags.od6s.explosivePending.<regionId>` entry that
 * `ExplosiveDialog.handleResult` would normally write after placement, then
 * call `item.roll(false, region.id)` to enter the resolution dialog.
 *
 * Determinism over dice: the resolution branch is gated on `flags.success`,
 * which is `roll.total >= difficulty`. We mutate `dlg.rollData.difficulty`
 * directly before submitting (1 for guaranteed success, 9999 for guaranteed
 * failure) so the four assertions don't depend on RNG. 1 (not 0) for the
 * success path: roll-execute.ts:117 is `if (rollData.difficulty)`, which
 * treats 0 as falsy and falls back to getDifficulty().
 *
 * The four branches run as phases of a single test rather than four separate
 * tests to avoid inter-test races: the auto-explosive flow updates regions,
 * items, and chat messages from multiple async hooks (chat-hooks,
 * region-hooks), and stray pending updates from a prior phase land on
 * embedded documents the next phase already deleted, surfacing as
 * "id … does not exist in the EmbeddedCollection collection" rejections
 * that are unrelated to the assertions under test. Sequencing them in one
 * world-eval keeps the cleanup at the end and the result snapshot
 * deterministic.
 */

import {test, expect} from "@playwright/test";
import {loginAndWaitReady, evalInWorld} from "./helpers/foundry-page.js";

type PhaseResult = {
    name: string;
    dialogOpened: boolean;
    chatCreated: boolean;
    success: boolean | null;
    regionFlags: Record<string, unknown> | null;
    regionVisibility: number | null;
    regionShape: {x: number; y: number} | null;
    placementShape: {x: number; y: number};
    lastMessageId: string | null;
};

type SpecResult = {
    userId: string | null;
    phases: PhaseResult[];
    errs: string[];
};

test("auto-explosive resolution: success stamps owner+template, failure scatters, end_of_round gates reveal", async ({page}) => {
    await loginAndWaitReady(page);

    const result: SpecResult = await evalInWorld(page, async () => {
        const errs: string[] = [];
        const onRej = (e: PromiseRejectionEvent) => {
            const msg = e.reason?.message ?? String(e.reason);
            // Teardown races between region-delete + chat-message-delete
            // hooks land in this listener but are not the bugs this spec
            // is verifying — the documented regressions are ReferenceError
            // from scatter (PR #24) and visibility/owner flag writes.
            // Filter known race shapes so they don't drown the signal:
            //   - "id … does not exist in the EmbeddedCollection collection"
            //     (region/token/item lookup against a just-deleted parent)
            //   - "Cannot read properties of undefined (reading 'tokens')"
            //     (chat-hooks.ts preDelete hook when speaker.scene was
            //     never set or was already torn down)
            if (/does not exist in the EmbeddedCollection collection/.test(msg)) return;
            if (/Cannot read properties of undefined \(reading 'tokens'\)/.test(msg)) return;
            errs.push("rej: " + msg);
        };
        window.addEventListener("unhandledrejection", onRej);

        const prev = {
            auto: window.game.settings.get("od6s", "auto_explosive"),
            end: window.game.settings.get("od6s", "explosive_end_of_round"),
            zones: window.game.settings.get("od6s", "explosive_zones"),
            mapRange: window.game.settings.get("od6s", "map_range_to_difficulty"),
        };

        const phases: PhaseResult[] = [];
        let scene: any = null;
        let actor: any = null;
        let weapon: any = null;
        const createdRegions: string[] = [];
        const createdTokens: string[] = [];
        try {
            // Single-roll blast model: multi-zone needs all four
            // blast_radius.range entries configured, which the smoke item
            // doesn't bother with.
            await window.game.settings.set("od6s", "explosive_zones", false);
            // Disable range→difficulty mapping so our forced difficulty
            // actually wins; otherwise getDifficulty would override it.
            await window.game.settings.set("od6s", "map_range_to_difficulty", false);
            await window.game.settings.set("od6s", "auto_explosive", true);

            actor = window.game.actors.find((a: any) => a.name === "smoke-character");
            if (!actor) {
                actor = await window.Actor.create(
                    {name: "smoke-character", type: "character"},
                    {render: false},
                );
            }
            // Throwing skill resolves through AGI in this system.
            if (actor.system.attributes.agi.base < 1) {
                await actor.update({"system.attributes.agi.base": 9});
            }

            const stale = actor.items.filter(
                (i: any) => i.type === "weapon" && i.name === "smoke-explosive",
            ).map((i: any) => i.id);
            if (stale.length) await actor.deleteEmbeddedDocuments("Item", stale);
            [weapon] = await actor.createEmbeddedDocuments("Item", [{
                name: "smoke-explosive",
                type: "weapon",
                system: {
                    subtype: "Explosive",
                    damage: {score: 12, type: "p"},
                    range: {short: "10", medium: "20", long: "40"},
                    stats: {skill: "Throwing", attribute: "AGI"},
                    blast_radius: {
                        "1": {range: 2, damage: 12},
                        "2": {range: 4, damage: 6},
                        "3": {range: 6, damage: 3},
                        "4": {range: 8, damage: 1},
                    },
                },
            }]);

            scene = window.game.scenes.find((s: any) => s.name === "test-scene");
            if (!scene) {
                scene = await window.Scene.create({name: "test-scene"});
            }
            await scene.activate();
            for (let i = 0; i < 50; i++) {
                if (window.canvas.ready && window.canvas.scene?.id === scene.id) break;
                await new Promise((r) => setTimeout(r, 200));
            }

            // Pre-purge any leftover explosive regions and chat messages
            // from earlier sessions. Stale messages with isExplosive +
            // template flags trigger the updateChatMessage hook on settings
            // changes, and target the region id — which by now no longer
            // exists — surfacing as the rejections we're filtering above.
            const leftoverRegions = scene.regions
                .filter((r: any) => r.flags?.od6s?.explosive === true)
                .map((r: any) => r.id);
            if (leftoverRegions.length) {
                await scene.deleteEmbeddedDocuments("Region", leftoverRegions);
            }
            const leftoverTokens = scene.tokens
                .filter((t: any) => t.actorId === actor.id)
                .map((t: any) => t.id);
            if (leftoverTokens.length) {
                await scene.deleteEmbeddedDocuments("Token", leftoverTokens);
            }
            const leftoverMsgs = window.game.messages.filter(
                (m: any) => m.getFlag("od6s", "isExplosive"),
            ).map((m: any) => m.id);
            if (leftoverMsgs.length) {
                await window.ChatMessage.deleteDocuments(leftoverMsgs);
            }

            const gridSize: number = window.canvas.grid.size;
            const originX = gridSize * 2;
            const originY = gridSize * 2;

            const td = await actor.getTokenDocument({x: originX, y: originY});
            const [tokenDoc] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
            createdTokens.push(tokenDoc.id);

            // One phase: pre-create region, pre-write pending flag, open
            // dialog, force success/failure via rollData.difficulty,
            // submit, snapshot region. Each phase runs against a fresh
            // region so its assertions don't depend on prior phases.
            async function runPhase(
                name: string,
                opts: {forceSuccess: boolean; endOfRound: boolean; placementOffsetCells: number},
            ): Promise<PhaseResult> {
                await window.game.settings.set("od6s", "explosive_end_of_round", opts.endOfRound);

                const placementX = gridSize * (2 + opts.placementOffsetCells);
                const placementY = gridSize * 2;
                const radiusPixels = 2 * window.canvas.dimensions.distancePixels;

                const [region] = await scene.createEmbeddedDocuments("Region", [{
                    name: `Explosive-${name}`,
                    visibility: 1,
                    shapes: [{
                        type: "ellipse",
                        x: placementX,
                        y: placementY,
                        radiusX: radiusPixels,
                        radiusY: radiusPixels,
                    }],
                    flags: {
                        od6s: {
                            explosive: true,
                            actor: actor.uuid,
                            item: weapon.id,
                        },
                    },
                }]);
                createdRegions.push(region.id);

                const distance = Math.floor(window.canvas.grid.measurePath([
                    {x: originX, y: originY},
                    {x: placementX, y: placementY},
                ]).distance);
                await weapon.update({
                    [`flags.od6s.explosivePending.${region.id}`]: {
                        origin: {x: originX, y: originY},
                        range: distance,
                    },
                });

                const apps0 = new Set([...window.foundry.applications.instances.keys()]);
                const msgsBefore = window.game.messages.size;
                await weapon.roll(false, region.id);
                await new Promise((r) => setTimeout(r, 600));

                const dlg = [...window.foundry.applications.instances.values()].find(
                    (a: any) => !apps0.has(a.id) && a.constructor.name.includes("RollDialog"),
                );
                if (!dlg) {
                    return {
                        name,
                        dialogOpened: false,
                        chatCreated: false,
                        success: null,
                        regionFlags: null,
                        regionVisibility: null,
                        regionShape: null,
                        placementShape: {x: placementX, y: placementY},
                        lastMessageId: null,
                    };
                }

                // 1 (not 0) for the success path: roll-execute.ts:117 uses
                // `if (rollData.difficulty)` which treats 0 as falsy and
                // falls back to getDifficulty(). 1 is satisfied by any roll
                // ≥ 1, which the smoke actor's AGI=9 guarantees.
                (dlg as any).rollData.difficulty = opts.forceSuccess ? 1 : 9999;
                (dlg as any).rollData.range = "OD6S.RANGE_SHORT_SHORT";

                (dlg as any).element.querySelector('[data-action="submit"]')?.click();

                // Poll until the resolution path's last side-effect lands:
                // `clearExplosivePending(item, regionId)` removes the
                // per-region entry from `flags.od6s.explosivePending`. By
                // then `templateId`, `originalOwner`, the visibility flip
                // (if any), and the scatter (on failure) have all been
                // awaited. Bound at 5 s — if it doesn't clear by then the
                // resolution didn't run, and the assertions fall through
                // with meaningful messages rather than a fixed-sleep flake.
                let regionFlags: Record<string, unknown> | null = null;
                let regionVisibility: number | null = null;
                let regionShape: {x: number; y: number} | null = null;
                for (let i = 0; i < 50; i++) {
                    const pending = (weapon.getFlag("od6s", "explosivePending") ?? {}) as Record<string, unknown>;
                    const stillPending = Object.prototype.hasOwnProperty.call(pending, region.id);
                    if (!stillPending) {
                        const fresh = scene.regions.get(region.id);
                        regionFlags = fresh ? {...fresh.flags?.od6s} : null;
                        regionVisibility = fresh?.visibility ?? null;
                        regionShape = fresh ? {x: fresh.shapes[0].x, y: fresh.shapes[0].y} : null;
                        break;
                    }
                    await new Promise((r) => setTimeout(r, 100));
                }

                const chatCreated = window.game.messages.size > msgsBefore;
                const msgs = [...window.game.messages.contents];
                const last = msgs[msgs.length - 1];
                const success = last?.flags?.od6s?.success ?? null;

                return {
                    name,
                    dialogOpened: true,
                    chatCreated,
                    success,
                    regionFlags,
                    regionVisibility,
                    regionShape,
                    placementShape: {x: placementX, y: placementY},
                    lastMessageId: last?.id ?? null,
                };
            }

            // Spread placement coords across phases so a leftover
            // pending-flag entry from a prior phase can't satisfy the
            // current phase's region lookup by accident.
            phases.push(await runPhase("A-success", {forceSuccess: true, endOfRound: false, placementOffsetCells: 4}));
            phases.push(await runPhase("B-failure", {forceSuccess: false, endOfRound: false, placementOffsetCells: 6}));
            phases.push(await runPhase("C1-reveal", {forceSuccess: true, endOfRound: false, placementOffsetCells: 8}));
            phases.push(await runPhase("C2-defer", {forceSuccess: true, endOfRound: true, placementOffsetCells: 10}));

            return {userId: window.game.user.id, phases, errs};
        } catch (e) {
            errs.push((e as Error).message);
            return {userId: null, phases, errs};
        } finally {
            try {
                if (scene) {
                    const stillThere = createdRegions.filter((id) => scene.regions.get(id));
                    if (stillThere.length) {
                        await scene.deleteEmbeddedDocuments("Region", stillThere);
                    }
                    const tokensLeft = createdTokens.filter((id) => scene.tokens.get(id));
                    if (tokensLeft.length) {
                        await scene.deleteEmbeddedDocuments("Token", tokensLeft);
                    }
                }
            } catch { /* ignore */ }
            try {
                if (weapon) {
                    await weapon.update({"flags.od6s.-=explosivePending": null});
                }
            } catch { /* ignore */ }
            await window.game.settings.set("od6s", "auto_explosive", prev.auto);
            await window.game.settings.set("od6s", "explosive_end_of_round", prev.end);
            await window.game.settings.set("od6s", "explosive_zones", prev.zones);
            await window.game.settings.set("od6s", "map_range_to_difficulty", prev.mapRange);
            window.removeEventListener("unhandledrejection", onRej);
        }
    });

    expect(result.errs, "unhandled rejections (excluding teardown-race EmbeddedCollection lookups)").toEqual([]);

    const byName = Object.fromEntries(result.phases.map((p) => [p.name, p]));

    // Branch A — successful auto-explosive throw stamps owner + template.
    const a = byName["A-success"];
    expect(a, "phase A ran").toBeDefined();
    expect(a.dialogOpened, "A: roll dialog opened").toBe(true);
    expect(a.chatCreated, "A: chat message created").toBe(true);
    expect(a.success, "A: forced success").toBe(true);
    expect(a.regionFlags?.originalOwner, "A: originalOwner === user.id").toBe(result.userId);
    expect(a.regionFlags?.templateId, "A: templateId === last message id").toBe(a.lastMessageId);

    // Branch B — failed throw runs scatterExplosive without ReferenceError.
    const b = byName["B-failure"];
    expect(b, "phase B ran").toBeDefined();
    expect(b.dialogOpened, "B: roll dialog opened").toBe(true);
    expect(b.chatCreated, "B: chat message created").toBe(true);
    expect(b.success, "B: forced failure").toBe(false);
    // `scatterExplosive` stamps `originalX`/`originalY` on the region
    // before computing the new position; their presence is the canonical
    // "scatter ran" sentinel. Asserting on the post-scatter shape position
    // is unreliable: a 1d6 scatter that hits the scene boundary's
    // testCollision wall is clipped back to ~origin (distanceToCollision
    // can be ≤ 0), so position-equality false-fails. The errs check above
    // already guards the original ReferenceError concern from PR #24.
    expect(b.regionFlags?.originalX, "B: scatter stamped originalX on region").toBe(b.placementShape.x);
    expect(b.regionFlags?.originalY, "B: scatter stamped originalY on region").toBe(b.placementShape.y);

    // Branch C1 — explosive_end_of_round=false reveals region (visibility=2).
    const c1 = byName["C1-reveal"];
    expect(c1, "phase C1 ran").toBeDefined();
    expect(c1.regionVisibility, "C1: region visibility = ALL").toBe(2);

    // Branch C2 — explosive_end_of_round=true defers reveal (visibility stays 1).
    const c2 = byName["C2-defer"];
    expect(c2, "phase C2 ran").toBeDefined();
    expect(c2.regionVisibility, "C2: region visibility stays GM-only until end of round").toBe(1);
});
