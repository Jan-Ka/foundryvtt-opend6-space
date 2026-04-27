const fields = foundry.data.fields;

export default class ContainerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      itemtypes: new fields.SchemaField({
        armor: new fields.BooleanField({ initial: true }),
        weapon: new fields.BooleanField({ initial: true }),
        gear: new fields.BooleanField({ initial: true }),
        cybernetics: new fields.BooleanField({ initial: false }),
        vehicle_weapons: new fields.BooleanField({ initial: false }),
        vehicle_gear: new fields.BooleanField({ initial: false }),
        starship_weapons: new fields.BooleanField({ initial: false }),
        starship_gear: new fields.BooleanField({ initial: false }),
      }),
      merchant: new fields.BooleanField({ initial: true }),
      visible: new fields.BooleanField({ initial: false }),
      locked: new fields.BooleanField({ initial: false }),
    };
  }
}
