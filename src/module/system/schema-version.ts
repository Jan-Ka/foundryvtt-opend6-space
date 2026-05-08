/**
 * Runtime helpers for the per-document `_systemSchemaVersion` stamp.
 *
 * Pure logic lives here so it can be unit-tested without Foundry globals.
 * See also `src/module/data/fields/schema-version.ts` (the schema field) and
 * `src/module/system/migration.ts` (which bumps stamps after migrations).
 */

export const SCHEMA_VERSION_KEY = "_systemSchemaVersion";

export type SchemaVersionState = "ok" | "unstamped" | "lag" | "ahead";

/**
 * Compare a document's recorded schema version against the running system
 * version. `cmp` is injected so this stays pure (no `foundry.utils` import);
 * production callers pass `foundry.utils.isNewerVersion`.
 */
export function compareSchemaVersion(
  stamp: string | undefined | null,
  current: string,
  cmp: (a: string, b: string) => boolean,
): SchemaVersionState {
  if (!stamp) return "unstamped";
  if (stamp === current) return "ok";
  if (cmp(current, stamp)) return "lag";
  if (cmp(stamp, current)) return "ahead";
  return "ok";
}

const warned = new Set<string>();
let notifiedGM = false;

/**
 * Console-warn at most once per (doc, state) when its stamp lags or runs
 * ahead of the running system version. Also surfaces a single GM-visible
 * `ui.notifications.warn` per session pointing at the console — per-doc
 * toasts would spam on worlds with many lagging docs.
 *
 * `unstamped` is silent — that's the steady state for pre-#85 docs and for
 * docs about to be stamped by migration.
 */
export function warnIfSchemaVersionMismatch(doc: { id?: string | null; name?: string | null; type?: string }, system: Record<string, unknown> | null | undefined) {
  if (!system) return;
  const stamp = system[SCHEMA_VERSION_KEY] as string | undefined;
  const current = game?.system?.version;
  if (!current) return;

  const state = compareSchemaVersion(
    stamp,
    current,
    (a, b) => foundry.utils.isNewerVersion(a, b),
  );
  if (state === "ok" || state === "unstamped") return;

  const key = `${doc.type ?? "?"}:${doc.id ?? "?"}:${state}`;
  if (warned.has(key)) return;
  warned.add(key);

  const label = `${doc.type ?? "doc"} "${doc.name ?? doc.id}"`;
  if (state === "lag") {
    console.warn(
      `[od6s:schema-version] ${label} was stamped ${stamp} but system is ${current}; world migrations may not have run yet.`,
    );
  } else {
    console.warn(
      `[od6s:schema-version] ${label} was stamped ${stamp} which is newer than the running system ${current}; this world was opened in a newer system version. Schema fields may render incorrectly.`,
    );
  }

  if (!notifiedGM && game.user?.isGM) {
    notifiedGM = true;
    ui.notifications?.warn(
      "OpenD6 Space: one or more documents have a schema-version mismatch. See the browser console for details.",
    );
  }
}
