import { vehicleCommonSchema } from "../actor/fields/vehicle-common";

const fields = foundry.data.fields;

export default class VehicleItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...vehicleCommonSchema(),
      cover: new fields.SchemaField({
        value: new fields.StringField({ initial: "" }),
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.COVER" }),
      }),
      altitude: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "OD6S.ALTITUDE" }),
      }),
    };
  }
}
