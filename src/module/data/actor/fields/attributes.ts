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
      agi: attributeField("NONEX_IST_OD6S.CHAR_AGILITY", "NONEX_IST_OD6S.CHAR_AGILITY_SHORT"),
      str: attributeField("NONEX_IST_OD6S.CHAR_STRENGTH", "NONEX_IST_OD6S.CHAR_STRENGTH_SHORT"),
      mec: attributeField("NONEX_IST_OD6S.CHAR_MECHANICAL", "NONEX_IST_OD6S.CHAR_MECHANICAL_SHORT"),
      kno: attributeField("NONEX_IST_OD6S.CHAR_KNOWLEDGE", "NONEX_IST_OD6S.CHAR_KNOWLEDGE_SHORT"),
      per: attributeField("NONEX_IST_OD6S.CHAR_PERCEPTION", "NONEX_IST_OD6S.CHAR_PERCEPTION_SHORT"),
      tec: attributeField("NONEX_IST_OD6S.CHAR_TECHNICAL", "NONEX_IST_OD6S.CHAR_TECHNICAL_SHORT"),
      met: attributeField("NONEX_IST_OD6S.CHAR_METAPHYSICS", "NONEX_IST_OD6S.CHAR_METAPHYSICS_SHORT", false),
      ca1: attributeField("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_01", "NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_01_SHORT", false),
      ca2: attributeField("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_02", "NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_02_SHORT", false),
      ca3: attributeField("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_03", "NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_03_SHORT", false),
      ca4: attributeField("NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_04", "NONEX_IST_OD6S.CHAR_CUSTOM_ATTRIBUTE_04_SHORT", false),
    }),
  };
}
