import { attributesSchema } from "./fields/attributes";
import { vehicleCommonSchema } from "./fields/vehicle-common";

const fields = foundry.data.fields;

function sensorTypeField(label: any) {
  return new fields.SchemaField({
    score: new fields.NumberField({ initial: 0 }),
    range: new fields.NumberField({ initial: 0 }),
    label: new fields.StringField({ initial: label }),
    type: new fields.StringField({ initial: "Number" }),
  });
}

export default class StarshipData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...attributesSchema(),
      ...vehicleCommonSchema(),
      interstellar_drive: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        value: new fields.NumberField({ initial: 0 }),
        label: new fields.StringField({ initial: "OD6S.INTERSTELLAR_DRIVE" }),
      }),
      atmospheric: new fields.SchemaField({
        value: new fields.BooleanField({ initial: true }),
        type: new fields.StringField({ initial: "Boolean" }),
        label: new fields.StringField({ initial: "OD6S.ATMOSPHERIC" }),
        move: new fields.SchemaField({
          label: new fields.StringField({ initial: "OD6S.ATMOSPHERIC_MOVE" }),
          value: new fields.NumberField({ initial: 0 }),
          type: new fields.StringField({ initial: "Number" }),
        }),
        kph: new fields.SchemaField({
          label: new fields.StringField({ initial: "OD6S.ATMOSPHERIC_KPH" }),
          value: new fields.NumberField({ initial: 0 }),
          type: new fields.StringField({ initial: "Number" }),
        }),
      }),
      // Starship overrides sensors from vehicle_common with value: true
      sensors: new fields.SchemaField({
        value: new fields.BooleanField({ initial: true }),
        type: new fields.StringField({ initial: "Boolean" }),
        label: new fields.StringField({ initial: "OD6S.SENSORS" }),
        skill: new fields.StringField({ initial: "Sensors" }),
        mod: new fields.NumberField({ initial: 0 }),
        types: new fields.SchemaField({
          passive: sensorTypeField("OD6S.SENSORS_PASSIVE"),
          scan: sensorTypeField("OD6S.SENSORS_SCAN"),
          search: sensorTypeField("OD6S.SENSORS_SEARCH"),
          focus: sensorTypeField("OD6S.SENSORS_FOCUS"),
        }),
      }),
    };
  }
}
