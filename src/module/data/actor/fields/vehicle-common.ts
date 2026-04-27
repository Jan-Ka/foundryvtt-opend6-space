/**
 * Shared vehicle_common schema fields used by vehicle and starship actors.
 */

const fields = foundry.data.fields;

function numScoreField(label: string) {
  return new fields.SchemaField({
    score: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
  });
}

function numValueField(label: string) {
  return new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
  });
}

function strValueField(label: string, initial = "") {
  return new fields.SchemaField({
    value: new fields.StringField({ initial }),
    type: new fields.StringField({ initial: "String" }),
    label: new fields.StringField({ initial: label }),
  });
}

function rangedStatField(label: string, shortLabel: string) {
  return new fields.SchemaField({
    type: new fields.StringField({ initial: "Number" }),
    label: new fields.StringField({ initial: label }),
    short_label: new fields.StringField({ initial: shortLabel }),
    score: new fields.NumberField({ initial: 0 }),
  });
}

function sensorTypeField(label: any) {
  return new fields.SchemaField({
    score: new fields.NumberField({ initial: 0 }),
    range: new fields.NumberField({ initial: 0 }),
    label: new fields.StringField({ initial: label }),
    type: new fields.StringField({ initial: "Number" }),
  });
}

function shieldArcField(label: any) {
  return new fields.SchemaField({
    label: new fields.StringField({ initial: label }),
    value: new fields.NumberField({ initial: 0 }),
    type: new fields.StringField({ initial: "Number" }),
  });
}

export function vehicleCommonSchema() {
  return {
    vehicle_type: strValueField("OD6S.VEHICLE_TYPE"),
    initiative: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.INITIATIVE" }),
      formula: new fields.StringField({ initial: "" }),
      mod: new fields.NumberField({ initial: 0 }),
      score: new fields.NumberField({ initial: 0 }),
    }),
    damage: strValueField("OD6S.DAMAGE", "OD6S.NO_DAMAGE"),
    scale: new fields.SchemaField({
      score: new fields.NumberField({ initial: 3 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.SCALE" }),
    }),
    maneuverability: numScoreField("OD6S.MANEUVERABILITY"),
    toughness: numScoreField("OD6S.TOUGHNESS"),
    armor: numScoreField("OD6S.ARMOR"),
    move: numValueField("OD6S.MOVE"),
    cargo_capacity: numValueField("OD6S.CARGO_CAPACITY"),
    cost: numValueField("OD6S.COST"),
    price: strValueField("OD6S.PRICE"),
    crew: new fields.SchemaField({
      value: new fields.NumberField({ initial: 1, integer: true }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.CREW" }),
    }),
    crewmembers: new fields.ArrayField(new fields.ObjectField()),
    passengers: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0, integer: true }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.PASSENGERS" }),
    }),
    skill: strValueField("OD6S.SKILL"),
    specialization: strValueField("OD6S.SPECIALIZATION"),
    attribute: strValueField("OD6S.ATTRIBUTE", "mec"),
    dodge: new fields.SchemaField({
      score: new fields.NumberField({ initial: 0 }),
      mod: new fields.NumberField({ initial: 0 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.DODGE" }),
    }),
    sensors: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
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
    shields: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      allocated: new fields.NumberField({ initial: 0 }),
      type: new fields.StringField({ initial: "Number" }),
      label: new fields.StringField({ initial: "OD6S.SHIELDS" }),
      skill: new fields.StringField({ initial: "OD6S.SHIELDS" }),
      arcs: new fields.SchemaField({
        front: shieldArcField("OD6S.FRONT"),
        rear: shieldArcField("OD6S.REAR"),
        left: shieldArcField("OD6S.LEFT"),
        right: shieldArcField("OD6S.RIGHT"),
      }),
    }),
    ranged: rangedStatField("OD6S.RANGED_ATTACK_MOD", "OD6S.RANGED_ATTACK_MOD_SHORT"),
    ranged_damage: rangedStatField("OD6S.RANGED_DAMAGE_MOD", "OD6S.RANGED_DAMAGE_MOD_SHORT"),
    ram: rangedStatField("OD6S.RAM_ATTACK_MOD", "OD6S.RAM_ATTACK_MOD_SHORT"),
    ram_damage: rangedStatField("OD6S.RAM_DAMAGE_MOD", "OD6S.RAM_DAMAGE_MOD_SHORT"),
    length: numValueField("OD6S.LENGTH"),
    tonnage: numValueField("OD6S.TONNAGE"),
    embedded_pilot: new fields.SchemaField({
      value: new fields.BooleanField({ initial: false }),
      type: new fields.StringField({ initial: "Boolean" }),
      label: new fields.StringField({ initial: "OD6S.EMBEDDED_PILOT" }),
      actor: new fields.ObjectField({ initial: {} }),
    }),
    sheetmode: new fields.SchemaField({
      type: new fields.StringField({ initial: "String" }),
      label: new fields.StringField({ initial: "OD6S.SHEET_MODE" }),
      short_label: new fields.StringField({ initial: "OD6S.SHEET_MODE_SHORT" }),
      value: new fields.StringField({ initial: "normal" }),
    }),
    roll_mod: new fields.NumberField({ initial: 0 }),
  };
}
