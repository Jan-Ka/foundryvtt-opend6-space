/**
 * Aggregate `OD6S` config object — composed from typed submodules in this
 * directory. Mutable scalar fields (e.g. `fatePointsName`, `wildDieOneDefault`)
 * are written by `od6sSettings()` at module init from world settings; the
 * nested table objects are also mutated in place by some settings hooks
 * (see `settings/index.ts` adjusting `OD6S.difficulty[*]`).
 */

import attributes, { type Attributes } from "./attributes";
import deadliness, { type WoundLevel } from "./deadliness";
import statusEffects, { type StatusEffectDef } from "./status-effects";
import { actions, vehicleActions, type ActionDef } from "./actions";
import {
    armorDamage,
    damage,
    damageTypes,
    vehicleDamage,
    weaponDamage,
    type DamageLevel,
    type VehicleDamageLevel,
} from "./damage";
import {
    weaponTypes,
    weaponTypeKeys,
    meleeDifficulties,
    rangedAttackOptions,
    meleeAttackOptions,
    brawlAttackOptions,
    ranges,
    type AttackOption,
    type RangeBand,
    type WeaponTypeKey,
} from "./weapons";
import {
    actorTypeLabels,
    itemLabels,
    templateItemTypes,
    allowedItemTypes,
} from "./labels";
import {
    difficulty,
    difficultyShort,
    terrainDifficulty,
    result,
    type DifficultyBand,
    type ResultTier,
    type TerrainModifier,
} from "./difficulty";
import {
    cover,
    calledShot,
    gravity,
    misc,
    type CoverModifier,
    type CalledShotModifier,
} from "./modifiers";
import {
    vehicleSpeeds,
    collisionTypes,
    type VehicleSpeed,
    type CollisionType,
} from "./vehicles";
import {
    bodyPointLevels,
    woundsId,
    hitLocations,
    wildDieResult,
    hiddenStatusEffects,
} from "./wounds";

export interface CharacterPointLimits {
    skill: number;
    attribute: number;
    specialization: number;
    dodge: number;
    parry: number;
    block: number;
    dr: number;
    initiative: number;
    init?: number;
}

/**
 * Minimal structural type for the socketlib socket bound to OD6S.
 * The full socketlib API is untyped; we capture only the methods used
 * by this codebase so dynamic dispatch through `OD6S.socket` typechecks.
 * `register` callbacks are not type-checked because socketlib forwards
 * arbitrary arguments at runtime — that contract lives at the call sites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketLibCallback = (...args: any[]) => unknown;

export interface SocketLibSocket {
    register(name: string, handler: SocketLibCallback): void;
    executeAsGM(handler: string, ...args: unknown[]): Promise<unknown>;
    executeForOthers(handler: string, ...args: unknown[]): Promise<unknown>;
}

export interface InitiativeConfig {
    type: string;
    reroll: boolean;
    reroll_npc: boolean;
    reroll_character: boolean;
    dsn: boolean;
    attribute: string;
}

export interface DataTabConfig {
    defense: Record<string, string>;
    offense: Record<string, string>;
}

export interface ChatTemplates {
    generic: string;
    roll: string;
    opposed: string;
    damageresult: string;
    explosive: string;
    "explosive-button": string;
    range: string;
}

/**
 * Public surface of the OD6S config singleton. Most fields are populated at
 * module load (see object literal below); a number of scalar fields are
 * overwritten at init by `od6sSettings()` reading the world's settings.
 * The string index signature accepts the dynamic property writes still
 * performed by some settings hooks; new code should prefer the typed members.
 */
export interface Od6sConfig {
    // settings-driven scalars
    startCombat: boolean;
    socket: SocketLibSocket;
    baseHitDifficulty: number;
    default_sensor_skill: string;
    fatePointsName: string;
    fatePointsShortName: string;
    useAFatePointName: string;
    metaphysicsName: string;
    manifestationsName: string;
    metaphysicsExtranormalName: string;
    vehicleToughnessName: string;
    stunDice: boolean;
    passengerDamageDice: boolean;
    starshipToughnessName: string;
    interstellarDriveName: string;
    vehicleDifficulty: boolean;
    brawlAttribute: string;
    chatPath: string;
    wildDieOneDefault: number;
    wildDieOneAuto: number;
    grenadeDamageDice: boolean;
    highlightEffects: boolean;
    randomHitLocations: boolean;
    mapRange: boolean;
    meleeDifficulty: boolean;
    baseRangedAttackDifficulty: number;
    baseMeleeAttackDifficulty: number;
    baseBrawlAttackDifficulty: number;
    defenseLock: boolean;
    currencyName: string;
    fatePointRound: boolean;
    fatePointClimactic: boolean;
    woundConfig: number;
    bodyPointsName: string;
    highHitDamage: boolean;
    weaponArmorDamage: boolean;
    autoOpposed: boolean;
    autoPromptPlayerResistance: boolean;
    autoSkillUsed: boolean;
    pipsPerDice: number;
    speciesMaxDice: number;
    speciesMinDice: number;
    flatSkills: boolean;
    specLink: boolean;
    skillUsed: boolean;
    cost: number | string;
    fundsFate: boolean;
    showSkillSpecialization: boolean;
    specializationDice: boolean;
    specStartingPipsPerDie: number;
    channelSkillName: string;
    senseSkillName: string;
    transformSkillName: string;
    trackStuns: boolean;
    stunDamageIncrement: boolean;
    randomDifficlty: boolean;
    hideExplosiveTemplates: boolean;
    meleeRange: boolean;
    baseBrawlAttackDifficultyLevel: string;
    baseMeleeAttackDifficultyLevel: string;
    stunScaling: boolean;
    woundScaling: boolean;
    speciesLabelName: string;
    typeLabel: string;
    highHitDamageMultiplier: number;
    highHitDamagePipsOrDice: boolean;
    highHitDamageRound: boolean;
    advanceCostAttribute: number;
    advanceCostSkill: number;
    advanceCostMetaphysicsSkill: number;
    advanceCostSpecialization: number;
    resistanceOption: boolean;
    resistanceSkill: string;
    resistanceMultiplier: number;
    resistanceRound: boolean;
    strDamRound: boolean;
    strDamMultiplier: number;
    strDamSkill: string;
    od6Bonus: boolean;
    deletingMessage: boolean;
    initialAttributes: number;
    initialSkills: number;
    initialCharacterPoints: number;
    initialFatePoints: number;
    initialMove: number;

    // typed tables (composed from submodules)
    weaponDamage: Record<number, DamageLevel>;
    armorDamage: Record<number, DamageLevel>;
    characterPointLimits: CharacterPointLimits;
    explosives: string[];
    deadlinessLevel: Record<string, number>;
    wildDieResult: Record<number, string>;
    actorMasks: Record<string, number>;
    equippable: string[];
    cargo_hold: string[];
    deadliness: Record<number, Record<string, WoundLevel>>;
    damage: Record<string, number>;
    bodyPointLevels: Record<string, number>;
    vehicle_damage: Record<string, VehicleDamageLevel>;
    vehicle_speeds: Record<string, VehicleSpeed>;
    collision_types: Record<string, CollisionType>;
    weaponTypes: readonly string[];
    weaponTypeKeys: readonly WeaponTypeKey[];
    meleeDifficulties: readonly string[];
    actions: Record<string, ActionDef>;
    vehicle_actions: Record<string, ActionDef>;
    difficulty: Record<string, DifficultyBand>;
    difficultyShort: Record<string, string>;
    terrain_difficulty: Record<string, TerrainModifier>;
    result: Record<string, ResultTier>;
    cover: Record<string, Record<string, CoverModifier>>;
    calledShot: Record<string, CalledShotModifier>;
    gravity: Record<string, CoverModifier>;
    misc: Record<string, CoverModifier>;
    rangedAttackOptions: Record<string, AttackOption>;
    meleeAttackOptions: Record<string, AttackOption>;
    brawlAttackOptions: Record<string, AttackOption>;
    attributes: Attributes;
    ranges: Record<string, RangeBand>;
    damageTypes: Record<string, string>;
    cyberneticsLocations: readonly string[];
    allowedItemTypes: Record<string, string[]>;
    actorTypeLabels: Record<string, string>;
    templateItemTypes: Record<string, string[]>;
    itemLabels: Record<string, string>;
    chatTemplates: ChatTemplates;
    data_tab: DataTabConfig;
    hiddenStatusEffects: readonly string[];
    statusEffects: StatusEffectDef[];
    hitLocations: Record<string, string>;
    initiative: InitiativeConfig;
    woundsId: Record<string, string>;

    // escape hatch — settings/handlebars helpers still write/read by string key
    [key: string]: unknown;
}

const chatPath = "systems/od6s/templates/chat/";

const OD6S: Od6sConfig = {
    startCombat: false,
    // Bound by the `socketlib.ready` hook in src/module/socketlib.ts before
    // any consumer accesses it; pre-init reads would be a programming error.
    socket: undefined as unknown as SocketLibSocket,
    baseHitDifficulty: 10,
    default_sensor_skill: "OD6S.SENSORS",
    fatePointsName: "",
    fatePointsShortName: "",
    useAFatePointName: "",
    metaphysicsName: "",
    manifestationsName: "",
    metaphysicsExtranormalName: "",
    vehicleToughnessName: "",
    stunDice: false,
    passengerDamageDice: false,
    starshipToughnessName: "",
    interstellarDriveName: "",
    vehicleDifficulty: true,
    brawlAttribute: "",
    chatPath,
    wildDieOneDefault: 0,
    wildDieOneAuto: 0,
    grenadeDamageDice: false,
    highlightEffects: false,
    randomHitLocations: false,
    mapRange: false,
    meleeDifficulty: false,
    baseRangedAttackDifficulty: 10,
    baseMeleeAttackDifficulty: 10,
    baseBrawlAttackDifficulty: 10,
    defenseLock: false,
    currencyName: "OD6S.CHAR_CREDITS",
    fatePointRound: false,
    fatePointClimactic: false,
    woundConfig: 0,
    bodyPointsName: "OD6S.BODY_POINTS",
    highHitDamage: false,
    weaponArmorDamage: false,
    autoOpposed: false,
    autoPromptPlayerResistance: false,
    autoSkillUsed: false,
    pipsPerDice: 3,
    speciesMaxDice: 5,
    speciesMinDice: 1,
    flatSkills: false,
    specLink: true,
    skillUsed: true,
    cost: 0,
    fundsFate: false,
    showSkillSpecialization: true,
    specializationDice: false,
    specStartingPipsPerDie: 3,
    channelSkillName: "OD6S.METAPHYSICS_SKILL_CHANNEL",
    senseSkillName: "OD6S.METAPHYSICS_SKILL_SENSE",
    transformSkillName: "OD6S.METAPHYSICS_SKILL_TRANSFORM",
    trackStuns: false,
    stunDamageIncrement: true,
    randomDifficlty: false,
    hideExplosiveTemplates: true,
    meleeRange: false,
    baseBrawlAttackDifficultyLevel: "OD6S.DIFFICULTY_VERY_EASY",
    baseMeleeAttackDifficultyLevel: "OD6S.DIFFICULTY_VERY_EASY",
    stunScaling: false,
    woundScaling: false,
    speciesLabelName: "OD6S.CHAR_SPECIES",
    typeLabel: "OD6S.CHAR_TYPE",
    highHitDamageMultiplier: 5,
    highHitDamagePipsOrDice: false,
    highHitDamageRound: false,
    advanceCostAttribute: 10,
    advanceCostSkill: 1,
    advanceCostMetaphysicsSkill: 2,
    advanceCostSpecialization: 0.5,
    resistanceOption: false,
    resistanceSkill: "Stamina",
    resistanceMultiplier: 1,
    resistanceRound: false,
    strDamRound: false,
    strDamMultiplier: 0.5,
    strDamSkill: "Lift",
    od6Bonus: false,
    deletingMessage: false,
    initialAttributes: 54,
    initialSkills: 21,
    initialCharacterPoints: 5,
    initialFatePoints: 1,
    initialMove: 10,

    weaponDamage,
    armorDamage,
    characterPointLimits: {
        skill: 2,
        attribute: 2,
        specialization: 5,
        dodge: 5,
        parry: 5,
        block: 5,
        dr: 5,
        initiative: 5,
    },
    explosives: [
        "OD6S.EXPLOSIVE_THROWN",
        // TODO: "OD6S.EXPLOSIVE_TIMER",
        // TODO: "OD6S.EXPLOSIVE_TRIGGER"
    ],
    deadlinessLevel: { character: 3, creature: 3, npc: 3 },
    wildDieResult,
    actorMasks: { character: 0, npc: 1, creature: 2, vehicle: 3, starship: 4 },
    equippable: [
        "weapon",
        "armor",
        "gear",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear",
    ],
    cargo_hold: [
        "weapon",
        "armor",
        "gear",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear",
    ],
    deadliness,
    damage,
    bodyPointLevels,
    vehicle_damage: vehicleDamage,
    vehicle_speeds: vehicleSpeeds,
    collision_types: collisionTypes,
    weaponTypes,
    weaponTypeKeys,
    meleeDifficulties,
    actions,
    vehicle_actions: vehicleActions,
    difficulty,
    difficultyShort,
    terrain_difficulty: terrainDifficulty,
    result,
    cover,
    calledShot,
    gravity,
    misc,
    rangedAttackOptions,
    meleeAttackOptions,
    brawlAttackOptions,
    attributes,
    ranges,
    damageTypes,
    cyberneticsLocations: [
        "OD6S.HEAD",
        "OD6S.RIGHT_ARM",
        "OD6S.LEFT_ARM",
        "OD6S.BODY",
        "OD6S.RIGHT_LEG",
        "OD6S.LEFT_LEG",
    ],
    allowedItemTypes,
    actorTypeLabels,
    templateItemTypes,
    itemLabels,
    chatTemplates: {
        generic: chatPath + "generic.html",
        roll: chatPath + "roll.html",
        opposed: chatPath + "opposed.html",
        damageresult: chatPath + "damageresult.html",
        explosive: chatPath + "explosive.html",
        "explosive-button": chatPath + "explosive-button.html",
        range: chatPath + "range.html",
    },
    data_tab: {
        defense: {
            dodge: "OD6S.DODGE",
            parry: "OD6S.PARRY",
            block: "OD6S.BLOCK",
        },
        offense: {
            ranged: "OD6S.RANGED",
            melee: "OD6S.MELEE",
            brawl: "OD6S.BRAWL",
            initiative: "OD6S.INITIATIVE",
            strengthdamage: "OD6S.STRENGTH_DAMAGE",
            pr: "OD6S.PHYSICAL_RESISTANCE",
            er: "OD6S.ENERGY_RESISTANCE",
            move: "OD6S.MOVE",
        },
    },
    hiddenStatusEffects,
    statusEffects,
    hitLocations,
    initiative: {
        type: "roll",
        reroll: false,
        reroll_npc: false,
        reroll_character: false,
        dsn: false,
        attribute: "per",
    },
    woundsId,
};

export default OD6S;
