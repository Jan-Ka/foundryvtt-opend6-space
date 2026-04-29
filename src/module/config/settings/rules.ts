import OD6S from "../config-od6s";

export function registerRulesSettings() {
    game.settings.register("od6s", "bodypoints", {
        name: game.i18n.localize("OD6S.CONFIG_USE_BODY"),
        hint: game.i18n.localize("OD6S.CONFIG_USE_BODY_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: 0,
        type: Number,
        choices: {
            "0": game.i18n.localize("OD6S.CONFIG_USE_WOUNDS"),
            "1": game.i18n.localize("OD6S.CONFIG_USE_WOUNDS_WITH_BODY"),
            "2": game.i18n.localize("OD6S.CONFIG_USE_BODY_ONLY")
        },
        requiresReload: true,
        onChange: (value: number) => (OD6S.woundConfig = value)
    })

    game.settings.register("od6s", "stun_damage_increment", {
        name: game.i18n.localize("OD6S.CONFIG_STUN_DAMAGE_INCREMENT"),
        hint: game.i18n.localize("OD6S.CONFIG_STUN_DAMAGE_INCREMENT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.stunDamageIncrement = value)
    })

    game.settings.register("od6s", "highhitdamage", {
        name: game.i18n.localize("OD6S.CONFIG_USE_OPTIONAL_DAMAGE"),
        hint: game.i18n.localize("OD6S.CONFIG_USE_OPTIONAL_DAMAGE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.highHitDamage = value)
    })

    game.settings.register("od6s", "weapon_armor_damage", {
        name: game.i18n.localize("OD6S.CONFIG_USE_WEAPON_ARMOR_DAMAGE"),
        hint: game.i18n.localize("OD6S.CONFIG_USE_WEAPON_ARMOR_DAMAGE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.highHitDamage = value)
    })

    game.settings.register("od6s", "track_stuns", {
        name: game.i18n.localize("OD6S.CONFIG_TRACK_STUNS"),
        hint: game.i18n.localize("OD6S.CONFIG_TRACK_STUNS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => (OD6S.trackStuns = value)
    })

    /* TODO

            game.settings.register("od6s", "initoptions", {
              name:  game.i18n.localize("OD6S.CONFIG_INITIATIVE_SETTING"),
              hint:  game.i18n.localize("OD6S.CONFIG_INITIATIVE_SETTING_DESCRIPTION"),
              scope: "world",
              config: true,
              default: 1,
              type: Number,
              choices: {
                "0":  game.i18n.localize("OD6S.CONFIG_INITIATIVE_1"),
                "1":  game.i18n.localize("OD6S.CONFIG_INITIATIVE_2"),
                "2":  game.i18n.localize("OD6S.CONFIG_INITIATIVE_3"),
                "3":  game.i18n.localize("OD6S.CONFIG_INITIATIVE_4")
              }
            })

            game.settings.register("od6s", "initbonus", {
              name:  game.i18n.localize("OD6S.CONFIG_USE_INIT_BONUS"),
              hint:  game.i18n.localize("OD6S.CONFIG_USE_INIT_BONUS_DESCRIPTION"),
              scope: "world",
              config: true,
              default: false,
              type: Boolean
            })

            game.settings.register("od6s", "fastcombat", {
              name:  game.i18n.localize("OD6S.CONFIG_FAST_COMBAT"),
              hint:  game.i18n.localize("OD6S.CONFIG_FAST_COMBAT_DESCRIPTION"),
              scope: "world",
              config: true,
              default: false,
              type: Boolean
            })
            */

    game.settings.register("od6s", "hide_advantages_disadvantages", {
        name: game.i18n.localize("OD6S.CONFIG_HIDE_ADVANTAGES_DISADVANTAGES"),
        hint: game.i18n.localize("OD6S.CONFIG_HIDE_ADVANTAGES_DISADVANTAGES_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: () => {
            ui.compendium.render();
        }
    })

    game.settings.register("od6s", "specialization_dice", {
        name: game.i18n.localize('OD6S.CONFIG_SPECIALIZATION_DICE'),
        hint: game.i18n.localize('OD6S.CONFIG_SPECIALIZATION_DICE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.specializationDice = value
    })

    game.settings.register("od6s", "strength_damage", {
        name: game.i18n.localize("OD6S.CONFIG_STRENGTH_DAMAGE"),
        hint: game.i18n.localize("OD6S.CONFIG_STRENGTH_DAMAGE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        requiresReload: true,
        default: false
    })

    game.settings.register("od6s", "metaphysics_attribute_optional", {
        name: game.i18n.localize("OD6S.CONFIG_METAPHYSICS_ATTRIBUTE_OPTIONAL"),
        hint: game.i18n.localize("OD6S.CONFIG_METAPHYSICS_ATTRIBUTE_OPTIONAL_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        default: false
    })

    game.settings.register("od6s", "dice_for_scale", {
        name: game.i18n.localize('OD6S.CONFIG_DICE_FOR_SCALE'),
        hint: game.i18n.localize('OD6S.CONFIG_DICE_FOR_SCALE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        requiresReload: true,
        type: Boolean
    })

    game.settings.register("od6s", "sensors", {
        name: game.i18n.localize('OD6S.CONFIG_SENSORS'),
        hint: game.i18n.localize('OD6S.CONFIG_SENSORS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean
    })

    game.settings.register("od6s", "vehicle_difficulty", {
        name: game.i18n.localize('OD6S.CONFIG_VEHICLE_DIFFICULTY'),
        hint: game.i18n.localize('OD6S.CONFIG_VEHICLE_DIFFICULTY_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.vehicleDifficulty = value
    })

    game.settings.register("od6s", "stun_dice", {
        name: game.i18n.localize('OD6S.CONFIG_STUN_DICE'),
        hint: game.i18n.localize('OD6S.CONFIG_STUN_DICE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => OD6S.passengerDamageDice = value
    })

    game.settings.register("od6s", "passenger_damage_dice", {
        name: game.i18n.localize('OD6S.CONFIG_PASSENGER_DAMAGE_DICE'),
        hint: game.i18n.localize('OD6S.CONFIG_PASSENGER_DAMAGE_DICE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => OD6S.passengerDamageDice = value
    })

    game.settings.register("od6s", "dice_for_grenades", {
        name: game.i18n.localize('OD6S.CONFIG_GRENADE_DAMAGE_DICE'),
        hint: game.i18n.localize('OD6S.CONFIG_GRENADE_DAMAGE_DICE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.grenadeDamageDice = value
    })

    game.settings.register("od6s", "explosive_end_of_round", {
        name: game.i18n.localize('OD6S.CONFIG_EXPLOSIVE_END_OF_ROUND'),
        hint: game.i18n.localize('OD6S.CONFIG_EXPLOSIVE_END_OF_ROUND_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean
    })

    game.settings.register("od6s", "hide_explosive_templates", {
        name: game.i18n.localize('OD6S.CONFIG_HIDE_EXPLOSIVE_TEMPLATES'),
        hint: game.i18n.localize('OD6S.CONFIG_HIDE_EXPLOSIVE_TEMPLATES_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: true,
        type: Boolean,
        onChange: (value: boolean) => OD6S.hideExplosiveTemplates = value
    })

    game.settings.register("od6s", "explosive_zones", {
        name: game.i18n.localize('OD6S.CONFIG_EXPLOSIVE_ZONES'),
        hint: game.i18n.localize('OD6S.CONFIG_EXPLOSIVE_ZONES_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean
    })

    game.settings.register("od6s", "map_range_to_difficulty", {
        name: game.i18n.localize('OD6S.CONFIG_MAP_RANGE_TO_DIFFICULTY'),
        hint: game.i18n.localize('OD6S.CONFIG_MAP_RANGE_TO_DIFFICULTY_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => OD6S.mapRange = value
    })

    game.settings.register("od6s", "melee_difficulty", {
        name: game.i18n.localize('OD6S.CONFIG_MELEE_DIFFICULTY'),
        hint: game.i18n.localize('OD6S.CONFIG_MELEE_DIFFICULTY_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.meleeDifficulty = value
    })

    game.settings.register("od6s", "cost", {
        name: game.i18n.localize('OD6S.CONFIG_COST'),
        hint: game.i18n.localize('OD6S.CONFIG_COST_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: "1",
        type: String,
        choices: {
            "0": game.i18n.localize("OD6S.CONFIG_COST_PRICE"),
            "1": game.i18n.localize("OD6S.CONFIG_COST_COST"),
        },
        onChange: (value: string) => OD6S.cost = value
    })

    game.settings.register("od6s", "funds_fate", {
        name: game.i18n.localize('OD6S.CONFIG_FUNDS_FATE'),
        hint: game.i18n.localize('OD6S.CONFIG_FUNDS_FATE'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.fundsWild = value
    })

    game.settings.register("od6s", "random_hit_locations", {
        name: game.i18n.localize('OD6S.CONFIG_RANDOM_HIT_LOCATIONS'),
        hint: game.i18n.localize('OD6S.CONFIG_RANDOM_HIT_LOCATIONS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => OD6S.randomHitLocations = value
    })

    game.settings.register("od6s", "pip_per_dice", {
        name: game.i18n.localize('OD6S.CONFIG_PIP_PER_DICE'),
        hint: game.i18n.localize('OD6S.CONFIG_PIP_PER_DICE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: 3,
        type: Number,
        onChange: (value: number) => OD6S.pipsPerDice = value
    })

    game.settings.register("od6s", "flat_skills", {
        name: game.i18n.localize('OD6S.CONFIG_FLAT_SKILLS'),
        hint: game.i18n.localize('OD6S.CONFIG_FLAT_SKILLS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.flatSkills = value
    })

    game.settings.register("od6s", "skill_used", {
        name: game.i18n.localize('OD6S.CONFIG_SKILL_USED'),
        hint: game.i18n.localize('OD6S.CONFIG_SKILL_USED_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.flatSkills = value
    })

    game.settings.register("od6s", "spec_link", {
        name: game.i18n.localize('OD6S.CONFIG_SPEC_LINK'),
        hint: game.i18n.localize('OD6S.CONFIG_SPEC_LINK_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: boolean) => OD6S.flatSkills = value
    })

    game.settings.register("od6s", "initial_attributes", {
        name: game.i18n.localize('OD6S.CONFIG_INITIAL_ATTRIBUTES'),
        hint: game.i18n.localize('OD6S.CONFIG_INITIAL_ATTRIBUTES_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: OD6S.initialAttributes,
        type: Number,
        onChange: (value: number) => OD6S.initialAttributes = value
    })

    game.settings.register("od6s", "initial_skills", {
        name: game.i18n.localize('OD6S.CONFIG_INITIAL_SKILLS'),
        hint: game.i18n.localize('OD6S.CONFIG_INITIAL_SKILLS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: OD6S.initialSkills,
        type: Number,
        requiresReload: true,
        onChange: (value: number) => OD6S.initialSkills = value
    })

    game.settings.register("od6s", "initial_character_points", {
        name: game.i18n.localize('OD6S.CONFIG_INITIAL_CHARACTER_POINTS'),
        hint: game.i18n.localize('OD6S.CONFIG_INITIAL_CHARACTER_POINTS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: OD6S.initialCharacterPoints,
        type: Number,
        onChange: (value: number) => OD6S.initialCharacterPoints = value
    })

    game.settings.register("od6s", "initial_fate_points", {
        name: game.i18n.localize('OD6S.CONFIG_INITIAL_FATE_POINTS'),
        hint: game.i18n.localize('OD6S.CONFIG_INITIAL_FATE_POINTS_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: OD6S.initialFatePoints,
        type: Number,
        requiresReload: true,
        onChange: (value: number) => OD6S.initialFatePoints = value
    })

    game.settings.register("od6s", "initial_move", {
        name: game.i18n.localize('OD6S.CONFIG_INITIAL_MOVE'),
        hint: game.i18n.localize('OD6S.CONFIG_INITIAL_MOVE_DESCRIPTION'),
        scope: "world",
        config: false,
        od6sRules: true,
        default: OD6S.initialMove,
        type: Number,
        onChange: (value: number) => OD6S.initialMove = value
    })
}
