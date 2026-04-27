/**
 * System data migration for world upgrades.
 * Runs once per version bump via the system version stored in world settings.
 */

const CURRENT_MIGRATION_VERSION = "2.0.0";

/**
 * Check if migration is needed and run it.
 * Called from the 'ready' hook.
 */
export async function migrateWorld() {
  if (!game.user.isGM) return;

  const lastMigration = game.settings.get("od6s", "migrationVersion") ?? "0";
  if (!foundry.utils.isNewerVersion(CURRENT_MIGRATION_VERSION, lastMigration)) return;

  ui.notifications.info("OpenD6 Space: Migrating world data — please be patient.", { permanent: true });

  try {
    // Run all migrations in order
    if (foundry.utils.isNewerVersion("2.0.0", lastMigration)) {
      await migrateExplosiveTemplateFlags();
      await migrateChatMessageFlags();
    }

    // Record completion
    await game.settings.set("od6s", "migrationVersion", CURRENT_MIGRATION_VERSION);
    ui.notifications.info("OpenD6 Space: Migration complete.");
  } catch (err) {
    console.error("od6s | Migration failed:", err);
    ui.notifications.error("OpenD6 Space: Migration failed. Check the console for details.");
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
      await (actor as any).updateEmbeddedDocuments("Item", updates);
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
