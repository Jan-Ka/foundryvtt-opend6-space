import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

function attributeRangeSchema() {
  return new fields.SchemaField({
    min: new fields.NumberField({ initial: 3 }),
    max: new fields.NumberField({ initial: 15 }),
  });
}

export default class SpeciesTemplateData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      attributes: new fields.SchemaField({
        agi: attributeRangeSchema(),
        str: attributeRangeSchema(),
        kno: attributeRangeSchema(),
        mec: attributeRangeSchema(),
        per: attributeRangeSchema(),
        tec: attributeRangeSchema(),
        met: attributeRangeSchema(),
      }),
      items: new fields.ArrayField(new fields.ObjectField()),
      label: new fields.StringField({ initial: "OD6S.SPECIES_TEMPLATE" }),
    };
  }
}
