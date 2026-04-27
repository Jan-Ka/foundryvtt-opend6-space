/**
 * Shared attribute schema fields used by character, NPC, creature, vehicle, and starship actors.
 */

const fields = foundry.data.fields;

function attributeField(label: any, shortLabel: any, hasMinMax = true) {
  const schema = {
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    base: new fields.NumberField({ initial: 0, integer: true }),
    mod: new fields.NumberField({ initial: 0, integer: true }),
    score: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
  };
  if (hasMinMax) {
    (schema as any).max = new fields.NumberField({ initial: 15, integer: true });
    (schema as any).min = new fields.NumberField({ initial: 3, integer: true });
  }
  return new fields.SchemaField(schema);
}

export function attributesSchema() {
  return {
    attributes: new fields.SchemaField({
      agi: attributeField("OD6S.CHAR_AGILITY", "OD6S.CHAR_AGILITY_SHORT"),
      str: attributeField("OD6S.CHAR_STRENGTH", "OD6S.CHAR_STRENGTH_SHORT"),
      mec: attributeField("OD6S.CHAR_MECHANICAL", "OD6S.CHAR_MECHANICAL_SHORT"),
      kno: attributeField("OD6S.CHAR_KNOWLEDGE", "OD6S.CHAR_KNOWLEDGE_SHORT"),
      per: attributeField("OD6S.CHAR_PERCEPTION", "OD6S.CHAR_PERCEPTION_SHORT"),
      tec: attributeField("OD6S.CHAR_TECHNICAL", "OD6S.CHAR_TECHNICAL_SHORT"),
      met: attributeField("OD6S.CHAR_METAPHYSICS", "OD6S.CHAR_METAPHYSICS_SHORT", false),
      ca1: attributeField("OD6S.CHAR_CUSTOM_ATTRIBUTE_01", "OD6S.CHAR_CUSTOM_ATTRIBUTE_01_SHORT", false),
      ca2: attributeField("OD6S.CHAR_CUSTOM_ATTRIBUTE_02", "OD6S.CHAR_CUSTOM_ATTRIBUTE_02_SHORT", false),
      ca3: attributeField("OD6S.CHAR_CUSTOM_ATTRIBUTE_03", "OD6S.CHAR_CUSTOM_ATTRIBUTE_03_SHORT", false),
      ca4: attributeField("OD6S.CHAR_CUSTOM_ATTRIBUTE_04", "OD6S.CHAR_CUSTOM_ATTRIBUTE_04_SHORT", false),
    }),
  };
}
