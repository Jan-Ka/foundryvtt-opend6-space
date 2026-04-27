const fields = foundry.data.fields;

export function advantageFieldsSchema() {
  return {
    attribute: new fields.StringField({ initial: "" }),
    skill: new fields.StringField({ initial: "" }),
    value: new fields.StringField({ initial: "" }),
  };
}
