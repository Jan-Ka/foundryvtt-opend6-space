const fields = foundry.data.fields;

export function equipmentSchema() {
  return {
    cost: new fields.NumberField({ initial: 0 }),
    price: new fields.StringField({ initial: "" }),
    availability: new fields.StringField({ initial: "" }),
    quantity: new fields.NumberField({ initial: 1, integer: true }),
  };
}
