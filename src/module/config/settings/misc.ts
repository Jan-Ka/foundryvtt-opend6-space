import OD6S from "../config-od6s";
import {od6sutilities} from "../../system/utilities";
import {defineDeadliness, defineDifficultyMax, defineSetting} from "./helpers";

const DIFFICULTY_TIERS = [
    {key: "default_difficulty_very_easy", label: "OD6S.DIFFICULTY_VERY_EASY", max: 5},
    {key: "default_difficulty_easy", label: "OD6S.DIFFICULTY_EASY", max: 10},
    {key: "default_difficulty_moderate", label: "OD6S.DIFFICULTY_MODERATE", max: 15},
    {key: "default_difficulty_difficult", label: "OD6S.DIFFICULTY_DIFFICULT", max: 20},
    {key: "default_difficulty_very_difficult", label: "OD6S.DIFFICULTY_VERY_DIFFICULT", max: 25},
    {key: "default_difficulty_heroic", label: "OD6S.DIFFICULTY_HEROIC", max: 30},
    {key: "default_difficulty_legendary", label: "OD6S.DIFFICULTY_LEGENDARY", max: 40},
] as const;

// Per-difficulty random-dice counts; all share onChange handler that mirrors the
// original — assigning to OD6S.randomDifficulty (intentional global toggle, not per-tier).
const RANDOM_DICE_TIERS = [
    {key: "random_dice_difficulty_very_easy", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_VERY_EASY", default: 1},
    {key: "random_dice_difficulty_easy", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_EASY", default: 2},
    {key: "random_dice_difficulty_moderate", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_MODERATE", default: 4},
    {key: "random_dice_difficulty_difficult", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_DIFFICULT", default: 6},
    {key: "random_dice_difficulty_very_difficult", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_VERY_DIFFICULT", default: 8},
    {key: "random_dice_difficulty_heroic", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_HEROIC", default: 9},
    {key: "random_dice_difficulty_legendary", i18n: "OD6S.CONFIG_RANDOM_DIFFICULTY_LEGENDARY", default: 10},
] as const;

export function registerMiscSettings() {
    defineDeadliness("deadliness", "OD6S.CONFIG_DEADLINESS", "character", 3);
    defineDeadliness("npc-deadliness", "OD6S.CONFIG_NPC_DEADLINESS", "npc", 4);
    defineDeadliness("creature-deadliness", "OD6S.CONFIG_CREATURE_DEADLINESS", "creature", 4);

    defineSetting<boolean>("scale-stun", {
        i18nKey: "OD6S.CONFIG_SCALE_STUN",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sDeadliness",
        onChange: v => { OD6S.stunScaling = v; },
    });

    for (const tier of DIFFICULTY_TIERS) {
        defineDifficultyMax(tier.key, tier.label, tier.label, tier.max);
    }

    defineSetting<number>("default_ranged_attack_difficulty", {
        i18nKey: "OD6S.CONFIG_RANGED_ATTACK_DIFFICULTY",
        type: Number,
        default: 10,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: v => { OD6S.baseRangedAttackDifficulty = v; },
    });

    defineSetting<number>("default_melee_attack_difficulty", {
        i18nKey: "OD6S.CONFIG_MELEE_ATTACK_DIFFICULTY",
        type: Number,
        default: 10,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: v => { OD6S.baseMeleeAttackDifficulty = v; },
    });

    defineSetting<number>("default_brawl_attack_difficulty", {
        i18nKey: "OD6S.CONFIG_BRAWL_ATTACK_DIFFICULTY",
        type: Number,
        default: 10,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: v => { OD6S.baseBrawlAttackDifficulty = v; },
    });

    defineSetting<string>("default_brawl_attack_difficulty_level", {
        i18nKey: "OD6S.CONFIG_BRAWL_ATTACK_DIFFICULTY_LEVEL",
        type: String,
        default: "OD6S.DIFFICULTY_VERY_EASY",
        requiresReload: true,
        category: "od6sDifficulty",
        choices: od6sutilities.getDifficultyLevelSelect(),
        onChange: v => { OD6S.baseBrawlAttackDifficultyLevel = v; },
    });

    defineSetting<boolean>("default_unknown_difficulty", {
        i18nKey: "OD6S.CONFIG_DEFAULT_UNKNOWN_DIFFICULTY",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sDifficulty",
    });

    defineSetting<boolean>("random_difficulty", {
        i18nKey: "OD6S.CONFIG_RANDOM_DIFFICULTY",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: v => { OD6S.randomDifficulty = v; },
    });

    defineSetting<boolean>("random_dice_difficulty", {
        i18nKey: "OD6S.CONFIG_RANDOM_DICE_DIFFICULTY",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sDifficulty",
        onChange: v => { OD6S.randomDifficulty = v; },
    });

    for (const tier of RANDOM_DICE_TIERS) {
        defineSetting<number>(tier.key, {
            i18nKey: tier.i18n,
            type: Number,
            default: tier.default,
            requiresReload: true,
            category: "od6sDifficulty",
            onChange: v => { OD6S.randomDifficulty = v; },
        });
    }

    defineSetting<boolean>("melee_range", {
        i18nKey: "OD6S.CONFIG_MELEE_RANGE",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { OD6S.meleeRange = v; },
    });

    defineSetting<boolean>("static_str_range", {
        i18nKey: "OD6S.CONFIG_STATIC_STR_RANGE",
        type: Boolean,
        default: false,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { OD6S.meleeRange = v; },
    });

    defineSetting<number>("character_advanceCostAttribute", {
        i18nKey: "OD6S.CONFIG_ADVANCECOSTATTRIBUTE",
        type: Number,
        default: 10,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.advanceCostAttribute = v; },
    });

    defineSetting<number>("character_advanceCostSkill", {
        i18nKey: "OD6S.CONFIG_ADVANCECOSTSKILL",
        type: Number,
        default: 1,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.advanceCostSkill = v; },
    });

    defineSetting<number>("character_metaphysics_advanceCostSkill", {
        i18nKey: "OD6S.CONFIG_ADVANCECOSTSKILL_METAPHYSICS",
        type: Number,
        default: 2,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.advanceCostMetaphysicsSkill = v; },
    });

    defineSetting<number>("character_advanceCostSpecialization", {
        i18nKey: "OD6S.CONFIG_ADVANCECOSTSPECIALIZATION",
        type: Number,
        default: 0.5,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.advanceCostSpecialization = v; },
    });

    defineSetting<number>("character_highhitmultiplier", {
        i18nKey: "OD6S.CONFIG_HIGHHITMULTIPLIER",
        type: Number,
        default: 5,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.highHitDamageMultiplier = v; },
    });

    defineSetting<boolean>("highhit_pipsordice", {
        i18nKey: "OD6S.CONFIG_HIGHHITPIPSORDICE",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.highHitDamagePipsOrDice = v; },
    });

    defineSetting<boolean>("highhit_round", {
        i18nKey: "OD6S.CONFIG_HIGHHITROUND",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.highHitDamageRound = v; },
    });

    defineSetting<boolean>("customize_resistanceOption", {
        i18nKey: "OD6S.CONFIG_RESISTANCE_OPTION",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.resistanceOption = v; },
    });

    defineSetting<string>("customize_resistanceSkill", {
        i18nKey: "OD6S.CONFIG_RESISTANCESKILL",
        type: String,
        default: "Stamina",
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.resistanceSkill = v; },
    });

    defineSetting<boolean>("resistance_round", {
        i18nKey: "OD6S.CONFIG_RESISTANCEROUND",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.resistanceRound = v; },
    });

    defineSetting<number>("character_resistanceMultiplier", {
        i18nKey: "OD6S.CONFIG_RESISTANCEMULTIPLIER",
        type: Number,
        default: 1,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.resistanceMultiplier = v; },
    });

    defineSetting<string>("customize_strDamSkill", {
        i18nKey: "OD6S.CONFIG_STRDAMSKILL",
        type: String,
        default: "Lift",
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.strDamSkill = v; },
    });

    defineSetting<boolean>("od6_bonus", {
        i18nKey: "OD6S.CONFIG_OD6BONUS",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.od6Bonus = v; },
    });

    defineSetting<number>("character_strDamMultiplier", {
        i18nKey: "OD6S.CONFIG_STRDAMMULTIPLIER",
        type: Number,
        default: 0.5,
        requiresReload: true,
        category: "od6sMiscRules",
        onChange: v => { if (v) OD6S.strDamMultiplier = v; },
    });

    defineSetting<boolean>("strDam_round", {
        i18nKey: "OD6S.CONFIG_STRDAMROUND",
        type: Boolean,
        default: false,
        category: "od6sMiscRules",
        onChange: v => { OD6S.strDamRound = v; },
    });
}
