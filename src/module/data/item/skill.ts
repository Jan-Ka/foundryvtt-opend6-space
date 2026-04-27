import { baseSchema } from "./fields/base";
import { skillFieldsSchema } from "./fields/skill-fields";

const fields = foundry.data.fields;

export default class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...skillFieldsSchema(),
      label: new fields.StringField({ initial: "OD6S.CHAR_SKILLS" }),
    };
  }
}
