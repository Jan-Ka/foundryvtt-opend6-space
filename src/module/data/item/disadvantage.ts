import { baseSchema } from "./fields/base";
import { advantageFieldsSchema } from "./fields/advantage-fields";

const fields = foundry.data.fields;

export default class DisadvantageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...advantageFieldsSchema(),
      label: new fields.StringField({ initial: "OD6S.CHAR_DISADVANTAGES" }),
    };
  }
}
