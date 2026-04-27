/**
 * System data migration for world upgrades.
 * Runs once per version bump via the system version stored in world settings.
 *
 * To audit before/after document state, persist the debug flag *before*
 * reloading the world (otherwise migrations fire on the `ready` hook before
 * you can touch the console):
 *
 *   localStorage.od6sDebug = '["migration"]'
 *
 * Each touched actor will then log a `[before]` and `[after]` snapshot.
 */

import { debug, isDebugEnabled } from "./logger";

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
    console.error("od6s | Migration failed:", err);
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
  console.log("od6s | Migrating status effect icons from .png to .svg...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const effect of (actor as any).effects) {
      const img: string = effect.img ?? "";
      if (img.startsWith("systems/od6s/") && img.endsWith(".png")) {
        updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
      }
    }
    if (updates.length > 0) {
      logActorBefore("icons", actor);
      await (actor as any).updateEmbeddedDocuments("ActiveEffect", updates);
      logActorAfter("icons", actor);
      count += updates.length;
    }
  }

  for (const scene of game.scenes) {
    for (const token of (scene as any).tokens) {
      const updates = [];
      for (const effect of token.actor?.effects ?? []) {
        const img: string = effect.img ?? "";
        if (img.startsWith("systems/od6s/") && img.endsWith(".png")) {
          updates.push({ _id: effect.id, img: img.replace(/\.png$/, ".svg") });
        }
      }
      if (updates.length > 0) {
        logActorBefore("icons", token.actor, ` (token in ${(scene as any).name})`);
        await token.actor.updateEmbeddedDocuments("ActiveEffect", updates);
        logActorAfter("icons", token.actor, ` (token in ${(scene as any).name})`);
        count += updates.length;
      }
    }
  }

  console.log(`od6s | Updated ${count} status effect icons.`);
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
  console.log("od6s | Migrating explosive template flags on items...");
  let count = 0;

  for (const actor of game.actors) {
    const updates = [];
    for (const item of (actor as any).items) {
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
      await (actor as any).updateEmbeddedDocuments("Item", updates);
      logActorAfter("explosive-flags", actor);
      count += updates.length;
    }
  }

  // Also check unowned items in the world collection
  const worldItemUpdates = [];
  for (const item of game.items) {
    const explosiveTemplate = (item as any).getFlag("od6s", "explosiveTemplate");
    if (explosiveTemplate) {
      worldItemUpdates.push({
        _id: (item as any).id,
        "flags.od6s.-=explosiveTemplate": null,
        "flags.od6s.-=explosiveSet": null,
        "flags.od6s.-=explosiveOrigin": null,
        "flags.od6s.-=explosiveRange": null,
      });
    }
  }
  if (worldItemUpdates.length > 0) {
    await (Item as any).updateDocuments(worldItemUpdates);
    count += worldItemUpdates.length;
  }

  console.log(`od6s | Cleaned explosive flags from ${count} items.`);
}

/**
 * Clean up chat message flags that reference old MeasuredTemplate IDs.
 * Remove template references and mark explosive messages as handled
 * so they don't try to interact with non-existent templates.
 */
async function migrateChatMessageFlags() {
  console.log("od6s | Migrating chat message explosive flags...");
  let count = 0;

  const updates = [];
  for (const message of game.messages) {
    if ((message as any).getFlag("od6s", "isExplosive") && (message as any).getFlag("od6s", "template")) {
      updates.push({
        _id: (message as any).id,
        "flags.od6s.-=template": null,
        "flags.od6s.handled": true,
      });
      count++;
    }
  }

  if (updates.length > 0) {
    await (ChatMessage as any).updateDocuments(updates);
  }

  console.log(`od6s | Cleaned explosive flags from ${count} chat messages.`);
}
