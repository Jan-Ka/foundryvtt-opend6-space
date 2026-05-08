/**
 * Per-document schema-version stamp. Spread into every actor / item
 * `defineSchema()` so each document records the system version it was last
 * written against. See `src/module/system/schema-version.ts` for the runtime
 * comparison + warn logic, and `src/module/system/migration.ts` for the
 * stamping pass after world migrations run.
 *
 * Default is `""` (unstamped) — legacy docs that predate this field load
 * unstamped and are stamped on first save / next migration.
 */

import { SCHEMA_VERSION_KEY } from "../../system/schema-version";

export function schemaVersionField() {
  const fields = foundry.data.fields;
  return {
    [SCHEMA_VERSION_KEY]: new fields.StringField({ initial: "", required: false }),
  };
}
