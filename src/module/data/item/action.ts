import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

export default class ActionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      rollable: new fields.BooleanField({ initial: false }),
      type: new fields.StringField({ initial: "" }),
      subtype: new fields.StringField({ initial: "" }),
      itemId: new fields.StringField({ initial: "" }),
    };
  }
}
