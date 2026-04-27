/**
 * Shared "common" schema fields used by character, NPC, and creature actors.
 */

const fields = foundry.data.fields;

function modField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    mod: new fields.NumberField({ initial: 0 }),
  });
}

function modScoreField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    mod: new fields.NumberField({ initial: 0 }),
    score: new fields.NumberField({ initial: 0 }),
  });
}

export function commonSchema() {
  return {
    move: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_MOVE" }),
      mod: new fields.NumberField({ initial: 0 }),
      value: new fields.NumberField({ initial: 10 }),
    }),
    chartype: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_TYPE" }),
      content: new fields.StringField({ initial: "" }),
    }),
    species: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_SPECIES" }),
      content: new fields.StringField({ initial: "" }),
    }),
    wounds: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_HEALTH" }),
      short_label: new fields.StringField({ initial: "OD6S.CHAR_HEALTH" }),
      value: new fields.NumberField({ initial: 0, integer: true }),
      body_points: new fields.SchemaField({
        max: new fields.NumberField({ initial: 0 }),
        current: new fields.NumberField({ initial: 0 }),
      }),
    }),
    stuns: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_STUNS" }),
      value: new fields.NumberField({ initial: 0, integer: true }),
      current: new fields.NumberField({ initial: 0, integer: true }),
      rounds: new fields.NumberField({ initial: 0, integer: true }),
    }),
    strengthdamage: modScoreField("OD6S.STRENGTH_DAMAGE", "OD6S.STRENGTH_DAMAGE_SHORT"),
    ranged: modField("OD6S.RANGED_ATTACK_MOD", "OD6S.RANGED_ATTACK_MOD_SHORT"),
    melee: modField("OD6S.MELEE_ATTACK_MOD", "OD6S.MELEE_ATTACK_MOD_SHORT"),
    brawl: modField("OD6S.BRAWL_ATTACK_MOD", "OD6S.BRAWL_ATTACK_MOD_SHORT"),
    sheetmode: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.SHEET_MODE" }),
      short_label: new fields.StringField({ initial: "OD6S.SHEET_MODE_SHORT" }),
      value: new fields.StringField({ initial: "normal" }),
    }),
    dodge: modScoreField("OD6S.DODGE", "OD6S.DODGE_SHORT"),
    parry: modScoreField("OD6S.PARRY", "OD6S.PARRY_SHORT"),
    block: modScoreField("OD6S.BLOCK", "OD6S.BLOCK_SHORT"),
    pr: modScoreField("OD6S.PHYSICAL_RESISTANCE", "OD6S.PHYSICAL_RESISTANCE_SHORT"),
    er: modScoreField("OD6S.ENERGY_RESISTANCE", "OD6S.ENERGY_RESISTANCE_SHORT"),
    credits: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_CREDITS" }),
      value: new fields.NumberField({ initial: 0 }),
    }),
    funds: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_FUNDS" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    initiative: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.INITIATIVE" }),
      formula: new fields.StringField({ initial: "" }),
      mod: new fields.NumberField({ initial: 0 }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    scale: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.SCALE" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    customeffects: new fields.SchemaField({
      skills: new fields.ObjectField({ initial: {} }),
      specializations: new fields.ObjectField({ initial: {} }),
    }),
    custom1: new fields.SchemaField({ value: new fields.StringField({ initial: "" }) }),
    custom2: new fields.SchemaField({ value: new fields.StringField({ initial: "" }) }),
    custom3: new fields.SchemaField({ value: new fields.StringField({ initial: "" }) }),
    custom4: new fields.SchemaField({ value: new fields.StringField({ initial: "" }) }),
    labels: new fields.ObjectField({ initial: {} }),
    tags: new fields.ArrayField(new fields.StringField()),
    use_wild_die: new fields.BooleanField({ initial: true }),
    roll_mod: new fields.NumberField({ initial: 0 }),
  };
}
