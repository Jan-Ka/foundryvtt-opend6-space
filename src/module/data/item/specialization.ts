import { baseSchema } from "./fields/base";
import { skillFieldsSchema } from "./fields/skill-fields";

const fields = foundry.data.fields;

export default class SpecializationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...skillFieldsSchema(),
      skill: new fields.StringField({ initial: "" }),
      label: new fields.StringField({ initial: "OD6S.CHAR_SPECIALIZATIONS" }),
      used: new fields.SchemaField({
        value: new fields.BooleanField({ initial: false }),
      }),
    };
  }
}
