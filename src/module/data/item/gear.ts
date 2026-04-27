import { baseSchema } from "./fields/base";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";

const fields = foundry.data.fields;

export default class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      quantity: new fields.NumberField({ initial: 1 }),
      consumable: new fields.BooleanField({ initial: false }),
      label: new fields.StringField({ initial: "OD6S.CHAR_GEAR" }),
    };
  }
}
