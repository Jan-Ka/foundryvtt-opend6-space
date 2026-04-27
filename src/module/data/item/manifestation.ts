import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

function manifestationSkillSchema() {
  return new fields.SchemaField({
    value: new fields.BooleanField({ initial: false }),
    difficulty: new fields.StringField({ initial: "E" }),
    rolled: new fields.BooleanField({ initial: false }),
  });
}

export default class ManifestationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      label: new fields.StringField({ initial: "OD6S.CHAR_MANIFESTATIONS" }),
      attack: new fields.BooleanField({ initial: false }),
      activate: new fields.BooleanField({ initial: false }),
      active: new fields.BooleanField({ initial: false }),
      roll: new fields.BooleanField({ initial: false }),
      skills: new fields.SchemaField({
        channel: manifestationSkillSchema(),
        sense: manifestationSkillSchema(),
        transform: manifestationSkillSchema(),
      }),
    };
  }
}
