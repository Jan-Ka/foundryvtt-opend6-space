import { baseSchema } from "./fields/base";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";
import { vehicleWeaponsFieldsSchema } from "./fields/vehicle-weapons-fields";

const fields = foundry.data.fields;

export default class StarshipWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      ...vehicleWeaponsFieldsSchema(),
      "area-units": new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        value: new fields.NumberField({ initial: 0 }),
        label: new fields.StringField({ initial: "OD6S.AREA_UNITS" }),
      }),
      mass: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        value: new fields.NumberField({ initial: 0 }),
        label: new fields.StringField({ initial: "OD6S.MASS" }),
      }),
      energy: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        value: new fields.NumberField({ initial: 0 }),
        label: new fields.StringField({ initial: "OD6S.ENERGY" }),
      }),
      label: new fields.StringField({ initial: "OD6S.STARSHIP_WEAPON" }),
    };
  }
}
