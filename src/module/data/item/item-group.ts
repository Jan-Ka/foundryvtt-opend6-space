import { baseSchema } from "./fields/base";

const fields = foundry.data.fields;

export default class ItemGroupData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      actor_types: new fields.ArrayField(
        new fields.StringField(),
        { initial: ["character"] }
      ),
      items: new fields.ArrayField(new fields.ObjectField()),
      label: new fields.StringField({ initial: "OD6S.ITEM_GROUP" }),
    };
  }
}
