import OD6S from "../config-od6s";

export function registerAutomationSettings() {
    game.settings.register("od6s", "auto_opposed", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_OPPOSED"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_OPPOSED_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.autoOpposed = value : true)
    })

    game.settings.register("od6s", "auto_explosive", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_EXPLOSIVE"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_EXPLOSIVE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.autoPromptPlayerResistance = value : true)
    })

    game.settings.register("od6s", "auto_prompt_player_resistance", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_PROMPT_PLAYER_RESISTANCE"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_PROMPT_PLAYER_RESISTANCE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.autoPromptPlayerResistance = value : true)
    })

    /*
    game.settings.register("od6s", "auto_stunned", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_STUNNED"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_STUNNED_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true
    })
     */

    game.settings.register("od6s", "auto_incapacitated", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_INCAPACITATED"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_INCAPACITATED_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true
    })

    game.settings.register("od6s", "auto_mortally_wounded", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_MORTALLY_WOUNDED"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_MORTALLY_WOUNDED_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true
    })

    game.settings.register("od6s", "auto_status", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_STATUS"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_STATUS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: true,
        requiresReload: true
    })

    game.settings.register("od6s", "auto_armor_damage", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_ARMOR_DAMAGE"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_ARMOR_DAMAGE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.autoOpposed = value : true)
    })

    game.settings.register("od6s", "auto_skill_used", {
        name: game.i18n.localize("OD6S.CONFIG_AUTO_SKILL_USED"),
        hint: game.i18n.localize("OD6S.CONFIG_AUTO_SKILL_USED_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sAutomation: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.autoSkillUsed = value : true)
    })
}
