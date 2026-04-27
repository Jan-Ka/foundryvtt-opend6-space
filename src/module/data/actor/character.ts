import { attributesSchema } from "./fields/attributes";
import { commonSchema } from "./fields/common";

const fields = foundry.data.fields;

export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...attributesSchema(),
      ...commonSchema(),
      background: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_BACKGROUND" }),
        content: new fields.HTMLField({ initial: "" }),
      }),
      created: new fields.SchemaField({
        type: new fields.StringField({ initial: "Boolean" }),
        label: new fields.StringField({ initial: "OD6S.CREATED" }),
        value: new fields.BooleanField({ initial: true }),
      }),
      fatepoints: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_FATE_POINTS" }),
        short_label: new fields.StringField({ initial: "OD6S.CHAR_FATE_POINTS_SHORT" }),
        value: new fields.NumberField({ initial: 0, integer: true }),
      }),
      characterpoints: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_CHAR_POINTS" }),
        short_label: new fields.StringField({ initial: "OD6S.CHAR_CHAR_POINTS_SHORT" }),
        value: new fields.NumberField({ initial: 0, integer: true }),
      }),
      gender: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_GENDER" }),
        content: new fields.StringField({ initial: "" }),
      }),
      age: new fields.SchemaField({
        type: new fields.StringField({ initial: "Number" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_AGE" }),
        content: new fields.StringField({ initial: "" }),
      }),
      height: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_HEIGHT" }),
        content: new fields.StringField({ initial: "" }),
      }),
      weight: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_WEIGHT" }),
        content: new fields.StringField({ initial: "" }),
      }),
      description: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_PHYSICAL_DESCRIPTION" }),
        content: new fields.HTMLField({ initial: "" }),
      }),
      personality: new fields.SchemaField({
        type: new fields.StringField({ initial: "String" }),
        label: new fields.StringField({ initial: "OD6S.CHAR_PERSONALITY" }),
        content: new fields.HTMLField({ initial: "" }),
      }),
      metaphysicsextranormal: new fields.SchemaField({
        type: new fields.StringField({ initial: "Boolean" }),
        label: new fields.StringField({ initial: "OD6S.METAPHYSICS_EXTRANORMAL" }),
        value: new fields.BooleanField({ initial: false }),
      }),
      custom1: new fields.StringField({ initial: "" }),
      vehicle: new fields.ObjectField({ initial: {} }),
    };
  }
}
