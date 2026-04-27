import { baseSchema } from "./fields/base";
import { advantageFieldsSchema } from "./fields/advantage-fields";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";

const fields = foundry.data.fields;

export default class CyberneticData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...advantageFieldsSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      location: new fields.StringField({ initial: "" }),
      slots: new fields.NumberField({ initial: 0 }),
      label: new fields.StringField({ initial: "OD6S.CHAR_CYBERNETICS" }),
    };
  }
}
