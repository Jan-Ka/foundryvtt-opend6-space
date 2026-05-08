/**
 * System data migration for world upgrades.
 * Runs once per version bump via the system version stored in world settings.
 *
 * Two-tier migration policy
 * -------------------------
 * 1. **Per-document field-shape changes** (rename a `system.*` field, change
 *    a default, switch a field type): override `static migrateData(source)`
 *    on the relevant `TypeDataModel` subclass. Foundry calls it during
 *    construction, *before* validation, so old documents load cleanly the
 *    first time the world opens. See `src/module/data/item/weapon.ts` for
 *    an example (range NumberField → StringField, subtype i18n-key →
 *    localized) and `src/module/data/item/weapon-migration.ts` +
 *    `weapon.test.ts` for the pure-helper / unit-test pattern.
 *
 * 2. **Cross-document, flag-level, or scene-level changes** stay in this
 *    file as a `MIGRATION_STEPS` entry. These run once per world via the
 *    stored `migrationVersion` setting and can iterate `game.actors`,
 *    `game.scenes.tokens`, etc. — things `migrateData` can't reach because
 *    it only sees one document's `source` object.
 *
 * To audit before/after document state, persist the debug flag *before*
 * reloading the world (otherwise migrations fire on the `ready` hook before
 * you can touch the console):
 *
 *   localStorage.od6sDebug = '["migration"]'
 *
 * Each touched actor will then log a `[before]` and `[after]` snapshot.
 */

import { debug, error as logError, isDebugEnabled } from "./logger";
import { SCHEMA_VERSION_KEY } from "./schema-version";

/**
 * Migration steps in version order. Each entry runs when the world's stored
 * `migrationVersion` is older than `since`. Add new steps to the end; the
 * highest `since` becomes the recorded `migrationVersion` after a clean run.
 */
const MIGRATION_STEPS: Array<{ since: string; run: () => Promise<void> }> = [
  {
    since: "2.0.0",
    run: async () => {
      await migrateExplosiveTemplateFlags();
      await migrateChatMessageFlags();
    },
  },
  {
    since: "2.2.0",
    run: () => migrateStatusEffectIcons(),
  },
  {
    since: "2.5.0",
    run: () => migrateExplosivePendingFlags(),
  },
  {
    since: "2.6.0",
    run: () => stampAllSchemaVersions(),
  },
];

const CURRENT_MIGRATION_VERSION = MIGRATION_STEPS[MIGRATION_STEPS.length - 1]!.since;

/**
 * Check if migration is needed and run it.
 * Called from the 'ready' hook.
 */
export async function migrateWorld() {
  if (!game.user.isGM) return;

  const lastMigration = game.settings.get("od6s", "migrationVersion") ?? "0";
  if (!foundry.utils.isNewerVersion(CURRENT_MIGRATION_VERSION, lastMigration)) return;

  // V14 returns a Notification object with a bound .remove(); the project's
  // type stubs predate this, so cast through unknown.
  const inProgress = ui.notifications.info(
    "OpenD6 Space: Migrating world data — please be patient.",
    { permanent: true },
  ) as unknown as { remove?: () => void } | undefined;

  debug("migration", "starting", {
    from: lastMigration,
    to: CURRENT_MIGRATION_VERSION,
    actors: game.actors.size,
    items: game.items.size,
    scenes: game.scenes.size,
  });

  try {
    for (const step of MIGRATION_STEPS) {
      if (foundry.utils.isNewerVersion(step.since, lastMigration)) {
        await step.run();
      }
    }

    // Record completion
    await game.settings.set("od6s", "migrationVersion", CURRENT_MIGRATION_VERSION);
    ui.notifications.info("OpenD6 Space: Migration complete.");
  } catch (err) {
    logError("migration", "Migration failed:", err);
    ui.notifications.error("OpenD6 Space: Migration failed. Check the console for details.");
  } finally {
    inProgress?.remove?.();
  }
}

/**
 * Register the migration version setting.
 * Called during system init.
 */
export function registerMigrationSetting() {
  game.settings.register("od6s", "migrationVersion", {
    name: "Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0",
  });
}

/**
 * Update active effect icons that still reference old .png paths to .svg equivalents.
 * Affects any effect whose img is under systems/od6s/ and ends with .png.
 */
async function migrateStatusEffectIcons() {
  debug("migration", "Migrating status effect icons from .png to .svg...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const effect of actor.effects) {
      const img: string = effect.img ?? "";
      if (img.startsWith("systems/od6s/") && img.endsWith(".png")) {
        updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
      }
    }
    if (updates.length > 0) {
      logActorBefore("icons", actor);
      await actor.updateEmbeddedDocuments("ActiveEffect", updates);
      logActorAfter("icons", actor);
      count += updates.length;
    }
  }

  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      const updates = [];
      for (const effect of token.actor?.effects ?? []) {
        const img: string = effect.img ?? "";
        if (img.startsWith("systems/od6s/") && img.endsWith(".png")) {
          updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
        }
      }
      if (updates.length > 0) {
        logActorBefore("icons", token.actor, ` (token in ${scene.name})`);
        await token.actor.updateEmbeddedDocuments("ActiveEffect", updates);
        logActorAfter("icons", token.actor, ` (token in ${scene.name})`);
        count += updates.length;
      }
    }
  }

  debug("migration", `Updated ${count} status effect icons.`);
}

/** Snapshot an actor's full document state (deep-cloned via toObject) for audit logs. */
function logActorBefore(step: string, actor: any, suffix = "") {
  if (!isDebugEnabled("migration")) return;
  debug("migration", `[${step}:before] ${actor.name}${suffix}`, actor.toObject());
}
function logActorAfter(step: string, actor: any, suffix = "") {
  if (!isDebugEnabled("migration")) return;
  debug("migration", `[${step}:after]  ${actor.name}${suffix}`, actor.toObject());
}

/**
 * Clean up item flags that reference old MeasuredTemplate IDs.
 * In v14, MeasuredTemplate documents no longer exist — these are dangling references.
 * Clear the explosive flags so items are in a clean state.
 */
async function migrateExplosiveTemplateFlags() {
  debug("migration", "Migrating explosive template flags on items...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const item of actor.items) {
      const explosiveTemplate = item.getFlag("od6s", "explosiveTemplate");
      if (explosiveTemplate) {
        updates.push({
          _id: item.id,
          "flags.od6s.-=explosiveTemplate": null,
          "flags.od6s.-=explosiveSet": null,
          "flags.od6s.-=explosiveOrigin": null,
          "flags.od6s.-=explosiveRange": null,
        });
      }
    }
    if (updates.length > 0) {
      logActorBefore("explosive-flags", actor);
      await actor.updateEmbeddedDocuments("Item", updates);
      logActorAfter("explosive-flags", actor);
      count += updates.length;
    }
  }

  // Also check unowned items in the world collection
  const worldItemUpdates = [];
  for (const item of game.items) {
    const explosiveTemplate = item.getFlag("od6s", "explosiveTemplate");
    if (explosiveTemplate) {
      worldItemUpdates.push({
        _id: item.id,
        "flags.od6s.-=explosiveTemplate": null,
        "flags.od6s.-=explosiveSet": null,
        "flags.od6s.-=explosiveOrigin": null,
        "flags.od6s.-=explosiveRange": null,
      });
    }
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Cleaned explosive flags from ${count} items.`);
}

/**
 * Drop the legacy scalar explosive flags (`explosiveTemplate`, `explosiveOrigin`,
 * `explosiveRange`, `explosiveSet`). #40 replaces them with a per-region keyed
 * map at `flags.od6s.explosivePending.<regionId>`. Stale scalars are transient
 * pending state — the regions they pointed at have been gone since the v14
 * migration, and the new code reads only the keyed map.
 */
async function migrateExplosivePendingFlags() {
  debug("migration", "Dropping legacy scalar explosive flags...");
  let count = 0;

  const drop = {
    "flags.od6s.-=explosiveTemplate": null,
    "flags.od6s.-=explosiveOrigin": null,
    "flags.od6s.-=explosiveRange": null,
    "flags.od6s.-=explosiveSet": null,
  };

  for (const actor of game.actors) {
    const updates = [];
    for (const item of actor.items) {
      if (item.getFlag("od6s", "explosiveTemplate")
          || item.getFlag("od6s", "explosiveOrigin")
          || item.getFlag("od6s", "explosiveRange")
          || item.getFlag("od6s", "explosiveSet")) {
        updates.push({ _id: item.id, ...drop });
      }
    }
    if (updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", updates);
      count += updates.length;
    }
  }

  const worldItemUpdates = [];
  for (const item of game.items) {
    if (item.getFlag("od6s", "explosiveTemplate")
        || item.getFlag("od6s", "explosiveOrigin")
        || item.getFlag("od6s", "explosiveRange")
        || item.getFlag("od6s", "explosiveSet")) {
      worldItemUpdates.push({ _id: item.id, ...drop });
    }
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Dropped legacy scalar explosive flags from ${count} items.`);
}

/**
 * Clean up chat message flags that reference old MeasuredTemplate IDs.
 * Remove template references and mark explosive messages as handled
 * so they don't try to interact with non-existent templates.
 */
async function migrateChatMessageFlags() {
  debug("migration", "Migrating chat message explosive flags...");
  let count = 0;

  const updates = [];
  for (const message of game.messages) {
    if (message.getFlag("od6s", "isExplosive") && message.getFlag("od6s", "template")) {
      updates.push({
        _id: message.id,
        "flags.od6s.-=template": null,
        "flags.od6s.handled": true,
      });
      count++;
    }
  }

  if (updates.length > 0) {
    await ChatMessage.updateDocuments(updates);
  }

  debug("migration", `Cleaned explosive flags from ${count} chat messages.`);
}

/**
 * #85: Stamp every actor + item with the running system version. Runs once
 * for any world upgrading past 2.6.0 — after this, new docs are stamped on
 * `_preCreate` and warning logic in `system/schema-version.ts` can rely on
 * the field being populated for in-world docs.
 *
 * We overwrite any existing stamp. The field didn't exist before 2.6.0, so
 * any pre-existing value can only come from a doc imported from a future
 * (>=2.6.0) world into a still-pre-2.6.0 world — vanishingly rare, and the
 * world's migration history (in the settings store) is the source of truth
 * at this point. New docs from 2.6.0 onward stamp themselves on `_preCreate`.
 */
async function stampAllSchemaVersions() {
  const version = game.system.version;
  debug("migration", `Stamping all docs with system schema version ${version}...`);
  let count = 0;

  const actorUpdates: Array<Record<string, unknown>> = [];
  for (const actor of game.actors) {
    actorUpdates.push({ _id: actor.id, [`system.${SCHEMA_VERSION_KEY}`]: version });

    const itemUpdates: Array<Record<string, unknown>> = [];
    for (const item of actor.items) {
      itemUpdates.push({ _id: item.id, [`system.${SCHEMA_VERSION_KEY}`]: version });
    }
    if (itemUpdates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", itemUpdates);
      count += itemUpdates.length;
    }
  }
  if (actorUpdates.length > 0) {
    await Actor.updateDocuments(actorUpdates);
    count += actorUpdates.length;
  }

  const worldItemUpdates: Array<Record<string, unknown>> = [];
  for (const item of game.items) {
    worldItemUpdates.push({ _id: item.id, [`system.${SCHEMA_VERSION_KEY}`]: version });
  }
  if (worldItemUpdates.length > 0) {
    await Item.updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  debug("migration", `Stamped ${count} docs.`);
}
