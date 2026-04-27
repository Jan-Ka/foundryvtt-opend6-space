const fields = foundry.data.fields;

export function vehicleWeaponsFieldsSchema() {
  return {
    scale: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    damaged: new fields.NumberField({ initial: 0 }),
    ammo: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      value: new fields.NumberField({ initial: 0 }),
    }),
    arc: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      value: new fields.StringField({ initial: "" }),
    }),
    crew: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      value: new fields.NumberField({ initial: 1 }),
    }),
    attribute: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      value: new fields.StringField({ initial: "mec" }),
    }),
    skill: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      value: new fields.StringField({ initial: "" }),
    }),
    specialization: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      value: new fields.StringField({ initial: "" }),
    }),
    fire_control: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    range: new fields.SchemaField({
      short: new fields.NumberField({ initial: 0 }),
      medium: new fields.NumberField({ initial: 0 }),
      long: new fields.NumberField({ initial: 0 }),
    }),
    damage: new fields.SchemaField({
      type: new fields.StringField({ initial: "" }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    linked: new fields.SchemaField({
      type: new fields.StringField({ initial: "Number" }),
      value: new fields.NumberField({ initial: 0 }),
    }),
    difficulty: new fields.NumberField({ initial: 0 }),
    mods: new fields.SchemaField({
      difficulty: new fields.NumberField({ initial: 0 }),
      attack: new fields.NumberField({ initial: 0 }),
      damage: new fields.NumberField({ initial: 0 }),
    }),
  };
}
