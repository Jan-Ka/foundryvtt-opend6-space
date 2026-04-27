import { baseSchema } from "./fields/base";
import { equipmentSchema } from "./fields/equipment";
import { equipSchema } from "./fields/equip";
import { vehicleWeaponsFieldsSchema } from "./fields/vehicle-weapons-fields";

const fields = foundry.data.fields;

export default class VehicleWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      ...equipmentSchema(),
      ...equipSchema(),
      ...vehicleWeaponsFieldsSchema(),
      label: new fields.StringField({ initial: "OD6S.VEHICLE_WEAPON" }),
    };
  }
}
