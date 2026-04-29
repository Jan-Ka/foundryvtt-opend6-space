import OD6S from "../config-od6s";

export function registerWildDieSettings() {
    game.settings.register("od6s", "use_wild_die", {
        name: game.i18n.localize("OD6S.CONFIG_USE_WILD_DIE"),
        hint: game.i18n.localize("OD6S.CONFIG_USE_WILD_DIE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sWildDie: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "default_wild_one", {
        name: game.i18n.localize("OD6S.CONFIG_WILD_DIE_ONE"),
        hint: game.i18n.localize("OD6S.CONFIG_WILD_DIE_ONE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sWildDie: true,
        default: 0,
        type: Number,
        choices: {
            "0": game.i18n.localize("OD6S.CONFIG_WILD_DIE_0"),
            "1": game.i18n.localize("OD6S.CONFIG_WILD_DIE_1"),
            "2": game.i18n.localize("OD6S.CONFIG_WILD_DIE_2"),
            "3": game.i18n.localize("OD6S.CONFIG_WILD_DIE_3")
        },
        requiresReload: true,
        onChange: (value: number) => (OD6S.wildDieOneDefault = value)
    })

    game.settings.register("od6s", "default_wild_die_one_handle", {
        name: game.i18n.localize("OD6S.CONFIG_WILD_DIE_ONE_HANDLE"),
        hint: game.i18n.localize("OD6S.CONFIG_WILD_DIE_ONE_HANDLE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sWildDie: true,
        default: 0,
        type: Number,
        requiresReload: true,
        choices: {
            "0": game.i18n.localize("OD6S.CONFIG_WILD_DIE_HANDLE_0"),
            "1": game.i18n.localize("OD6S.CONFIG_WILD_DIE_HANDLE_1")
        },
        onChange: (value: number) => (OD6S.wildDieOneAuto = value)
    })

    game.settings.register("od6s", "wild_die_one_face", {
        name: game.i18n.localize('OD6S.CONFIG_WILD_DIE_ONE_FACE'),
        hint: game.i18n.localize("OD6S.CONFIG_WILD_DIE_ONE_FACE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sWildDie: true,
        default: "systems/od6s/icons/skull-shield.svg",
        type: String,
        filePicker: "image"
    })

    game.settings.register("od6s", "wild_die_six_face", {
        name: game.i18n.localize('OD6S.CONFIG_WILD_DIE_SIX_FACE'),
        hint: game.i18n.localize("OD6S.CONFIG_WILD_DIE_SIX_FACE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sWildDie: true,
        default: "systems/od6s/icons/eclipse-flare.svg",
        type: String,
        requiresReload: true,
        filePicker: "image"
    })
}
