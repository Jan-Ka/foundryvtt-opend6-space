/**
 * Pure migration body for `WeaponData.migrateData`. Lives in its own file so
 * unit tests can import it without pulling the rest of `weapon.ts` (which
 * touches the `foundry` global at module load).
 *
 * - `range.{short,medium,long}` were `NumberField`s pre-2.5.0; switched to
 *   `StringField` so attribute-relative syntax (`AGI+2`) works again. Old
 *   numeric values get re-stringified.
 * - `subtype` schema initial is the raw i18n key (`NONEX_IST_OD6S.RANGED`). All
 *   consumers (isRanged/isMuscle/isExplosive helpers, sheet `<option>`
 *   values) operate on localized strings, so the stored value is normalized
 *   to its localized form. `localize` is injected; production passes
 *   `game.i18n.localize` if available, else nothing (which is a no-op that
 *   runs again on the next construction once i18n is ready).
 */
export function migrateWeaponSource(
  source: Record<string, unknown>,
  localize?: (key: string) => string,
): Record<string, unknown> {
  if (source.range && typeof source.range === "object") {
    const range = source.range as Record<string, unknown>;
    for (const key of ["short", "medium", "long"]) {
      if (typeof range[key] !== "string") range[key] = String(range[key] ?? "0");
    }
  }
  if (typeof source.subtype === "string" && source.subtype.startsWith("NONEX_IST_OD6S.") && localize) {
    const localized = localize(source.subtype);
    if (localized && localized !== source.subtype) source.subtype = localized;
  }
  return source;
}
