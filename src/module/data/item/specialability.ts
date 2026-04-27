import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

export default class SpecialAbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      label: new fields.StringField({ initial: "OD6S.CHAR_SPECIAL_ABILITIES" }),
    };
  }
}
