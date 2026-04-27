import { baseSchema } from "./fields/base";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";

const fields = foundry.data.fields;

export default class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      pr: new fields.NumberField({ initial: 0 }),
      er: new fields.NumberField({ initial: 0 }),
      label: new fields.StringField({ initial: "OD6S.CHAR_ARMOR" }),
    };
  }
}
