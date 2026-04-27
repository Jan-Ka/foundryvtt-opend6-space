import OD6S from "../config-od6s";

export function registerDisplaySettings() {
    game.settings.register("od6s", "hide_compendia", {
        name: game.i18n.localize("OD6S.CONFIG_HIDE_COMPENDIA"),
        hint: game.i18n.localize("OD6S.CONFIG_HIDE_COMPENDIA_DESCRIPTION"),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        onChange: () => {
            ui.compendium.render();
        }
    })

    game.settings.register("od6s", "hide-skill-cards", {
        name: game.i18n.localize("OD6S.CONFIG_HIDE_SKILL_ROLLS"),
        hint: game.i18n.localize("OD6S.CONFIG_HIDE_SKILL_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "hide-combat-cards", {
        name: game.i18n.localize("OD6S.CONFIG_HIDE_ATTACK_ROLLS"),
        hint: game.i18n.localize("OD6S.CONFIG_HIDE_ATTACK_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "roll-modifiers", {
        name: game.i18n.localize("OD6S.CONFIG_SHOW_MODIFIERS"),
        hint: game.i18n.localize("OD6S.CONFIG_SHOW_MODIFIERS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "show-roll-difficulty", {
        name: game.i18n.localize("OD6S.CONFIG_SHOW_DIFFICULTY_DROPDOWN"),
        hint: game.i18n.localize("OD6S.CONFIG_SHOW_DIFFICULTY_DROPDOWN_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "hide-gm-rolls", {
        name: game.i18n.localize("OD6S.CONFIG_HIDE_GM_ROLLS"),
        hint: game.i18n.localize("OD6S.CONFIG_HIDE_GM_ROLLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sReveal: true,
        type: Boolean,
        requiresReload: true,
        default: true
    })

    game.settings.register("od6s", "highlight_effects", {
        name: game.i18n.localize('OD6S.CONFIG_HIGHLIGHT_EFFECTS'),
        hint: game.i18n.localize('OD6S.CONFIG_HIGHLIGHT_EFFECTS_DESCRIPTION'),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true,
        onChange: (value: any) => OD6S.highlightEffects = value
    })

    game.settings.register("od6s", "show_skill_specialization", {
        name: game.i18n.localize('OD6S.CONFIG_SHOW_SKILL_SPECIALIZATION'),
        hint: game.i18n.localize('OD6S.CONFIG_SHOW_SKILL_SPECIALIZATION_DESCRIPTION'),
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
        requiresReload: true,
        onChange: (value: any) => OD6S.showSkillSpecialization = value
    })

    game.settings.register("od6s", "show_metaphysics_attributes", {
        name: game.i18n.localize('OD6S.CONFIG_SHOW_METAPHYSICS_ATTRIBUTES'),
        hint: game.i18n.localize('OD6S.CONFIG_SHOW_METAPHYSICS_ATTRIBUTES_DESCRIPTION'),
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
        requiresReload: true
    })
}
