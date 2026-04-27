const fields = foundry.data.fields;

export function skillFieldsSchema() {
  return {
    attribute: new fields.StringField({ initial: "" }),
    min: new fields.BooleanField({ initial: false }),
    base: new fields.NumberField({ initial: 0 }),
    mod: new fields.NumberField({ initial: 0 }),
    score: new fields.NumberField({ initial: 0 }),
    time_taken: new fields.StringField({ initial: "One Round" }),
    isAdvancedSkill: new fields.BooleanField({ initial: false }),
    used: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
    }),
  };
}
