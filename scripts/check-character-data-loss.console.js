/*
 * OpenD6 Space — character data-loss audit (issue #159).
 *
 * Paste this entire file into Foundry's F12 console (in the world that may
 * be affected). It runs read-only audits and exposes two recovery helpers
 * on `window.od6sRecovery`. Nothing is written or deleted.
 *
 *   od6sRecovery.audit()                  — list suspect actors + reasons
 *   od6sRecovery.dumpAll()                — JSON of every actor (full toJSON)
 *   od6sRecovery.dump(actorIdOrName)      — JSON of a single actor
 *   od6sRecovery.restore(actorId, json)   — re-apply a previously-dumped JSON
 *                                            (GM-only; prompts for confirm)
 *
 * Recommended workflow for an affected world:
 *   1. od6sRecovery.audit()           — identify suspect actors
 *   2. copy(od6sRecovery.dumpAll())   — copy full backup to clipboard, save it
 *   3. restore from a Foundry world backup if data is genuinely gone
 */

(() => {
    if (typeof game === "undefined" || !game.ready) {
        console.error("[od6s] game not ready — wait for the world to finish loading.");
        return;
    }

    const BIO_FIELDS = ["description", "personality", "background"];

    function isEmptyHtml(s) {
        if (!s) return true;
        // PM-ish empty markers: "", "<p></p>", "<p><br></p>", whitespace.
        return s.replace(/<[^>]*>/g, "").trim() === "";
    }

    function looksUsed(actor) {
        const sys = actor.system ?? {};
        const cp = sys.characterpoints?.value ?? 0;
        const fp = sys.fatepoints?.value ?? 0;
        const items = actor.items?.size ?? 0;
        // A "used" character has CP spent, fate points, owned items, or any
        // attribute base above the freshly-created default of 0.
        const anyAttr = Object.values(sys.attributes ?? {})
            .some((a) => Number(a?.base?.value ?? a?.base ?? 0) > 0);
        return cp > 0 || fp > 0 || items > 0 || anyAttr;
    }

    function audit() {
        const rows = [];
        for (const actor of game.actors) {
            if (!["character", "npc", "creature"].includes(actor.type)) continue;
            const sys = actor.system ?? {};
            const bio = BIO_FIELDS.map((k) => ({k, content: sys[k]?.content ?? ""}));
            const allEmpty = bio.every((b) => isEmptyHtml(b.content));
            const used = looksUsed(actor);
            const stats = actor._stats ?? {};
            rows.push({
                name: actor.name,
                id: actor.id,
                type: actor.type,
                bioAllEmpty: allEmpty,
                looksUsed: used,
                suspect: allEmpty && used,
                modifiedTime: stats.modifiedTime ? new Date(stats.modifiedTime).toISOString() : null,
                lastModifiedBy: stats.lastModifiedBy ?? null,
                items: actor.items?.size ?? 0,
                cp: sys.characterpoints?.value ?? 0,
                fp: sys.fatepoints?.value ?? 0,
            });
        }
        const suspects = rows.filter((r) => r.suspect);
        console.group(`[od6s] data-loss audit — ${rows.length} actors scanned, ${suspects.length} suspect`);
        if (suspects.length) {
            console.warn("Suspect actors (used character + all bio fields empty):");
            console.table(suspects);
        } else {
            console.log("No suspect actors found.");
        }
        console.log("Full report:");
        console.table(rows);
        console.groupEnd();
        return {scanned: rows.length, suspects, all: rows};
    }

    function dump(idOrName) {
        const actor = game.actors.get(idOrName) ?? game.actors.getName(idOrName);
        if (!actor) {
            console.error(`[od6s] no actor matched '${idOrName}'`);
            return null;
        }
        return JSON.stringify(actor.toObject(), null, 2);
    }

    function dumpAll() {
        const payload = {
            world: game.world.id,
            system: game.system.id,
            systemVersion: game.system.version,
            foundryVersion: game.version,
            takenAt: new Date().toISOString(),
            actors: game.actors.map((a) => a.toObject()),
        };
        return JSON.stringify(payload, null, 2);
    }

    async function restore(actorId, json) {
        if (!game.user.isGM) {
            console.error("[od6s] restore requires GM.");
            return;
        }
        const actor = game.actors.get(actorId);
        if (!actor) {
            console.error(`[od6s] no actor with id ${actorId}`);
            return;
        }
        let data;
        try {
            data = typeof json === "string" ? JSON.parse(json) : json;
        } catch (e) {
            console.error("[od6s] could not parse JSON:", e);
            return;
        }
        const ok = window.confirm(
            `Restore actor '${actor.name}' (${actorId}) from supplied JSON? ` +
            `This OVERWRITES current data.`,
        );
        if (!ok) return;
        // Keep the current id; replace name + system + items.
        await actor.update({
            name: data.name,
            img: data.img,
            system: data.system,
        });
        // Items: delete current, recreate from backup.
        const ids = actor.items.map((i) => i.id);
        if (ids.length) await actor.deleteEmbeddedDocuments("Item", ids);
        if (data.items?.length) await actor.createEmbeddedDocuments("Item", data.items);
        console.log(`[od6s] restore complete for ${actor.name}`);
    }

    window.od6sRecovery = {audit, dump, dumpAll, restore};
    console.log("[od6s] recovery helpers attached to window.od6sRecovery — try od6sRecovery.audit()");
})();
