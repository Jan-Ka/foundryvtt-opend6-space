import OD6S from "../config-od6s";
import {defineCustomField, defineLabel, defineSetting} from "./helpers";

export function registerLabelSettings() {
    defineLabel("customize_species_label",
        "OD6S.CONFIG_CUSTOMIZE_SPECIES_LABEL",
        v => OD6S.speciesLabelName = v);

    defineLabel("customize_type_label",
        "OD6S.CONFIG_CUSTOMIZE_TYPE_LABEL",
        v => OD6S.typeLabelName = v);

    defineLabel("customize_fate_points",
        "OD6S.CONFIG_CUSTOMIZE_FATE_POINTS",
        v => OD6S.fatePointsName = v);

    defineLabel("customize_fate_points_short",
        "OD6S.CONFIG_CUSTOMIZE_FATE_POINTS_SHORT",
        v => OD6S.fatePointsShortName = v);

    defineLabel("customize_use_a_fate_point",
        "OD6S.CONFIG_CUSTOMIZE_USE_FATE_POINT",
        v => OD6S.useAFatePointName = v);

    // Custom character-sheet fields 1–4: name, name_short, type, actor_types.
    for (const i of [1, 2, 3, 4] as const) {
        const base = `OD6S.CONFIG_CUSTOM_CHARACTER_SHEET_FIELD_${i}`;
        defineCustomField(`custom_field_${i}`, base);
        defineCustomField(`custom_field_${i}_short`, `${base}_SHORT`);
        defineCustomField(`custom_field_${i}_type`, `${base}_TYPE`, {
            choices: {
                number: game.i18n.localize("OD6S.NUMBER"),
                string: game.i18n.localize("OD6S.STRING"),
            },
        });
        defineCustomField(`custom_field_${i}_actor_types`,
            "OD6S.CONFIG_CUSTOM_CHARACTER_SHEET_FIELD_ACTOR_TYPES", {
                type: Number,
                default: 1,
                actorType: true,
            });
    }

    defineLabel("customize_currency_label",
        "OD6S.CONFIG_CUSTOMIZE_CURRENCY_LABEL",
        v => OD6S.currencyName = v);

    defineLabel("customize_vehicle_toughness",
        "OD6S.CONFIG_CUSTOMIZE_VEHICLE_TOUGHNESS",
        v => OD6S.vehicle_toughnessName = v);

    defineLabel("customize_starship_toughness",
        "OD6S.CONFIG_CUSTOMIZE_STARSHIP_TOUGHNESS",
        v => OD6S.starship_toughnessName = v);

    defineSetting<string>("interstellar_drive_name", {
        i18nKey: "OD6S.CONFIG_INTERSTELLAR_DRIVE_NAME",
        type: String,
        default: "Interstellar Drive",
        requiresReload: true,
    });

    defineLabel("customize_manifestations",
        "OD6S.CONFIG_CUSTOMIZE_MANIFESTATIONS",
        v => OD6S.manifestationsName = v);

    defineLabel("customize_manifestation",
        "OD6S.CONFIG_CUSTOMIZE_MANIFESTATION",
        v => OD6S.manifestationName = v);

    defineLabel("customize_metaphysics_name",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_NAME",
        v => OD6S.attributes.met.name = v);

    defineLabel("customize_metaphysics_name_short",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_NAME_SHORT",
        v => OD6S.attributes.met.name = v,
        {requiresReload: false});

    defineLabel("customize_metaphysics_extranormal",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_EXTRANORMAL",
        v => OD6S.metaphysicsExtranormalName = v);

    defineLabel("customize_metaphysics_skill_channel",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_CHANNEL",
        v => OD6S.channelSkillName = v,
        {requiresReload: false});

    defineLabel("customize_metaphysics_skill_sense",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_SENSE",
        v => OD6S.senseSkillName = v);

    defineLabel("customize_metaphysics_skill_transform",
        "OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_TRANSFORM",
        v => OD6S.transformSkillName = v);

    // Core attribute names + short names.
    const attributes: ReadonlyArray<readonly [keyof typeof OD6S.attributes, string]> = [
        ["agi", "AGILITY"],
        ["str", "STRENGTH"],
        ["mec", "MECHANICAL"],
        ["kno", "KNOWLEDGE"],
        ["per", "PERCEPTION"],
        ["tec", "TECHNICAL"],
    ];
    for (const [attr, label] of attributes) {
        defineLabel(`customize_${label.toLowerCase()}_name`,
            `OD6S.CONFIG_CUSTOMIZE_${label}_NAME`,
            v => OD6S.attributes[attr].name = v);
        defineLabel(`customize_${label.toLowerCase()}_name_short`,
            `OD6S.CONFIG_CUSTOMIZE_${label}_NAME_SHORT`,
            v => OD6S.attributes[attr].shortName = v,
            {requiresReload: false});
    }

    // Custom attributes ca1–ca4.
    for (const i of [1, 2, 3, 4] as const) {
        const attr = `ca${i}` as const;
        defineLabel(`customize_${attr}_name`,
            `OD6S.CONFIG_CUSTOMIZE_CA${i}_NAME`,
            v => OD6S.attributes[attr].name = v);
        defineLabel(`customize_${attr}_name_short`,
            `OD6S.CONFIG_CUSTOMIZE_CA${i}_NAME_SHORT`,
            v => OD6S.attributes[attr].shortName = v,
            {requiresReload: false});
    }

    defineLabel("customize_body_points_name",
        "OD6S.CONFIG_CUSTOMIZE_BODY_POINTS_NAME",
        v => OD6S.bodyPointsName = v);
}
