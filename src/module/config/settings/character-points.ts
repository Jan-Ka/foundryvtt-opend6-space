import OD6S from "../config-od6s";

export function registerCharacterPointSettings() {
    game.settings.register("od6s", "character_points_skill_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_SKILL_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_SKILL_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 2,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.skill = value : 2)
    })

    game.settings.register("od6s", "character_points_attribute_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_ATTRIBUTE_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_ATTRIBUTE_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 2,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.attribute = value : 2)
    })

    game.settings.register("od6s", "character_points_specialization_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_SPECIALIZATION_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_SPECIALIZATION_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.specialization = value : 2)
    })

    game.settings.register("od6s", "character_points_dodge_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_DODGE_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_DODGE_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.dodge = value : 2)
    })

    game.settings.register("od6s", "character_points_parry_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_PARRY_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_PARRY_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.parry = value : 2)
    })

    game.settings.register("od6s", "character_points_block_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_BLOCK_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_BLOCK_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.block = value : 2)
    })

    game.settings.register("od6s", "character_points_dr_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_DR_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_DR_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.dr = value : 2)
    })

    game.settings.register("od6s", "character_points_init_limit", {
        name: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_INIT_LIMIT"),
        hint: game.i18n.localize("OD6S.CONFIG_CHARACTER_POINTS_INIT_LIMIT_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sCharacterPoints: true,
        type: Number,
        default: 5,
        requiresReload: true,
        onChange: (value: number) => (value ? OD6S.characterPointLimits.init = value : 2)
    })
}
