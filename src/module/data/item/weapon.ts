import { baseSchema } from "./fields/base";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";

const fields = foundry.data.fields;

function blastZoneSchema() {
  return new fields.SchemaField({
    range: new fields.NumberField({ initial: 0 }),
    damage: new fields.NumberField({ initial: 0 }),
    stun_range: new fields.NumberField({ initial: 0 }),
    stun_damage: new fields.NumberField({ initial: 0 }),
  });
}

export default class WeaponData extends foundry.abstract.TypeDataModel {
  static migrateData(source: Record<string, unknown>) {
    if (source.range && typeof source.range === "object") {
      const range = source.range as Record<string, unknown>;
      for (const key of ["short", "medium", "long"]) {
        if (typeof range[key] !== "string") range[key] = String(range[key] ?? "0");
      }
    }
    // Normalize subtype to the localized form. Helpers (isRanged,
    // isMuscle, isExplosive) and the weapon-sheet <option> values all
    // operate on localized strings, but the schema's initial is the
    // raw i18n key — so a brand-new weapon's stored subtype never
    // matches any rendered option until the user manually picks one.
    // localize() is a no-op when called before i18n is ready (returns
    // the key); we re-run it on every construction so the value
    // self-heals once i18n is up.
    if (typeof source.subtype === "string" && source.subtype.startsWith("OD6S.")) {
      const localized = (game as { i18n?: { localize?: (k: string) => string } } | undefined)
        ?.i18n?.localize?.(source.subtype);
      if (localized && localized !== source.subtype) source.subtype = localized;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...baseSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      scale: new fields.SchemaField({
        score: new fields.NumberField({ initial: 0 }),
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "OD6S.SCALE" }),
      }),
      // Helpers (isRanged, isMuscle, isExplosive) and the weapon-sheet
      // <option value> all operate on the *localized* subtype, so the
      // initial value must be the localized string, not the raw i18n
      // key. Falls back to the key if i18n isn't ready yet (early init);
      // migrateData below normalizes any key-form value on later loads.
      subtype: new fields.StringField({
        initial: () => (game as { i18n?: { localize?: (k: string) => string } } | undefined)
          ?.i18n?.localize?.("OD6S.RANGED") ?? "OD6S.RANGED",
      }),
      stats: new fields.SchemaField({
        attribute: new fields.StringField({ initial: "AGI" }),
        skill: new fields.StringField({ initial: "" }),
        specialization: new fields.StringField({ initial: "" }),
        parry_skill: new fields.StringField({ initial: "" }),
        parry_specialization: new fields.StringField({ initial: "" }),
      }),
      range: new fields.SchemaField({
        short: new fields.StringField({ initial: "0" }),
        medium: new fields.StringField({ initial: "0" }),
        long: new fields.StringField({ initial: "0" }),
      }),
      damage: new fields.SchemaField({
        type: new fields.StringField({ initial: "" }),
        score: new fields.NumberField({ initial: 0 }),
        muscle: new fields.BooleanField({ initial: false }),
        str: new fields.BooleanField({ initial: true }),
      }),
      blast_radius: new fields.SchemaField({
        1: blastZoneSchema(),
        2: blastZoneSchema(),
        3: blastZoneSchema(),
        4: blastZoneSchema(),
      }),
      damaged: new fields.NumberField({ initial: 0 }),
      ammo: new fields.NumberField({ initial: 0 }),
      ammo_price: new fields.StringField({ initial: "" }),
      ammo_cost: new fields.NumberField({ initial: 0 }),
      rof: new fields.NumberField({ initial: 0 }),
      stun: new fields.SchemaField({
        stun_only: new fields.BooleanField({ initial: false }),
        score: new fields.NumberField({ initial: 0 }),
        type: new fields.StringField({ initial: "e" }),
      }),
      difficulty: new fields.StringField({ initial: "OD6S.DIFFICULTY_EASY" }),
      mods: new fields.SchemaField({
        difficulty: new fields.NumberField({ initial: 0 }),
        attack: new fields.NumberField({ initial: 0 }),
        damage: new fields.NumberField({ initial: 0 }),
      }),
      label: new fields.StringField({ initial: "OD6S.CHAR_WEAPONS" }),
    };
  }
}
