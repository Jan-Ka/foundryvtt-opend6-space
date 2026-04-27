import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

export default class CharacterTemplateData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      species: new fields.StringField({ initial: "" }),
      attributes: new fields.SchemaField({
        agi: new fields.NumberField({ initial: 0 }),
        str: new fields.NumberField({ initial: 0 }),
        kno: new fields.NumberField({ initial: 0 }),
        mec: new fields.NumberField({ initial: 0 }),
        per: new fields.NumberField({ initial: 0 }),
        tec: new fields.NumberField({ initial: 0 }),
        met: new fields.NumberField({ initial: 0 }),
      }),
      fp: new fields.NumberField({ initial: 0 }),
      cp: new fields.NumberField({ initial: 0 }),
      funds: new fields.NumberField({ initial: 0 }),
      credits: new fields.NumberField({ initial: 0 }),
      move: new fields.NumberField({ initial: 10 }),
      me: new fields.BooleanField({ initial: false }),
      items: new fields.ArrayField(new fields.ObjectField()),
      label: new fields.StringField({ initial: "OD6S.CHARACTER_TEMPLATES" }),
    };
  }
}
