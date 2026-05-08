import { schemaVersionField } from "../../fields/schema-version";

const fields = foundry.data.fields;

export function baseSchema() {
  return {
    ...schemaVersionField(),
    description: new fields.HTMLField({ initial: "" }),
    labels: new fields.ObjectField({ initial: {} }),
    tags: new fields.ArrayField(new fields.StringField()),
  };
}
