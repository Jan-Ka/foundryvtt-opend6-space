import OD6S from "../config-od6s";
import {od6sutilities} from "../../system/utilities";

export async function updateRerollInitiative(value: any) {
    if (value) {
        OD6S.initiative.reroll_character = game.settings.get('od6s', 'auto_reroll_character');
        OD6S.initiative.reroll_npc = game.settings.get('od6s', 'auto_reroll_npc');
    } else {
        OD6S.initiative.reroll_character = false;
        OD6S.initiative.reroll_npc = false;
        await game.settings.set('od6s', 'auto_reroll_character', false);
        await game.settings.set('od6s', 'auto_reroll_npc', false);
    }
}

export function registerCombatSettings() {
    game.settings.register("od6s", "initiative_attribute", {
        name: game.i18n.localize("OD6S.CONFIG_INITIATIVE_ATTRIBUTE"),
        hint: game.i18n.localize("OD6S.CONFIG_INITIATIVE_ATTRIBUTE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sInitiative: true,
        type: String,
        default: 'per',
        requiresReload: true,
        choices: od6sutilities.getActiveAttributesSelect(),
        onChange: (value: any) => (OD6S.initiative.attribute = value)
    })

    game.settings.register("od6s", "reroll_initiative", {
        name: game.i18n.localize("OD6S.CONFIG_INITIATIVE_REROLL"),
        hint: game.i18n.localize("OD6S.CONFIG_INITIATIVE_REROLL_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sInitiative: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (updateRerollInitiative(value))
    })

    game.settings.register("od6s", "auto_reroll_npc", {
        name: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_REROLL_NPCS"),
        hint: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_REROLL_NPCS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sInitiative: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.initiative.reroll_npc = value : false)
    })

    game.settings.register("od6s", "auto_reroll_character", {
        name: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_REROLL_CHARACTER"),
        hint: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_REROLL_CHARACTER_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sInitiative: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.initiative.reroll_character = value : false)
    })

    game.settings.register("od6s", "auto_init_dsn", {
        name: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_DSN"),
        hint: game.i18n.localize("OD6S.CONFIG_INITIATIVE_AUTO_DSN_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sInitiative: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => (value ? OD6S.initiative.dsn = value : false)
    })

    game.settings.register("od6s", "brawl_attribute", {
        name: game.i18n.localize("OD6S.CONFIG_BRAWL_ATTRIBUTE"),
        hint: game.i18n.localize("OD6S.CONFIG_BRAWL_ATTRIBUTE_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        default: "agi",
        type: String,
        choices: {
            "agi": game.i18n.localize(OD6S.attributes.agi.name),
            "str": game.i18n.localize(OD6S.attributes.str.name),
        }
    })

    game.settings.register("od6s", "parry_skills", {
        name: game.i18n.localize("OD6S.CONFIG_PARRY_SKILLS"),
        hint: game.i18n.localize("OD6S.CONFIG_PARRY_SKILLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        default: false
    })

    game.settings.register("od6s", "reaction_skills", {
        name: game.i18n.localize("OD6S.CONFIG_REACTION_SKILLS"),
        hint: game.i18n.localize("OD6S.CONFIG_REACTION_SKILLS_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        requiresReload: true,
        default: false
    })

    game.settings.register("od6s", "defense_lock", {
        name: game.i18n.localize("OD6S.CONFIG_DEFENSE_LOCK"),
        hint: game.i18n.localize("OD6S.CONFIG_DEFENSE_LOCK_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        default: false,
        onChange: (value: any) => OD6S.defenseLock = value
    })

    game.settings.register("od6s", "fate_point_round", {
        name: game.i18n.localize("OD6S.CONFIG_FATE_POINT_ROUND"),
        hint: game.i18n.localize("OD6S.CONFIG_FATE_POINT_ROUND_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        default: false,
        requiresReload: true,
        onChange: (value: any) => OD6S.fatePointRound = value
    })

    game.settings.register("od6s", "fate_point_climactic", {
        name: game.i18n.localize("OD6S.CONFIG_FATE_POINT_CLIMACTIC"),
        hint: game.i18n.localize("OD6S.CONFIG_FATE_POINT_CLIMACTIC_DESCRIPTION"),
        scope: "world",
        config: false,
        od6sRules: true,
        type: Boolean,
        default: false,
        onChange: (value: any) => OD6S.fatePointClimactic = value
    })
}
