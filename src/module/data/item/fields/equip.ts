const fields = foundry.data.fields;

export function equipSchema() {
  return {
    equipped: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
      type: new fields.StringField({ initial: "Boolean" }),
      label: new fields.StringField({ initial: "OD6S.EQUIPPED" }),
      consumable: new fields.BooleanField({ initial: false }),
    }),
  };
}
