import attributes from "./attributes";
import deadliness from "./deadliness";
import statusEffects from "./status-effects";
import { actions, vehicleActions } from "./actions";
import { armorDamage, damage, damageTypes, vehicleDamage, weaponDamage } from "./damage";

const OD6S: Record<string, any> = {};

OD6S.startCombat = false;
OD6S.socket = '';
OD6S.baseHitDifficulty = 10;
OD6S.default_sensor_skill = "OD6S.SENSORS";
OD6S.fatePointsName = '';
OD6S.fatePointsShortName = '';
OD6S.useAFatePointName = '';
OD6S.metaphysicsName = '';
OD6S.manifestationsName = '';
OD6S.metaphysicsExtranormalName = '';
OD6S.vehicleToughnessName = '';
OD6S.stunDice = false;
OD6S.passengerDamageDice = false;
OD6S.starshipToughessName = '';
OD6S.vehicleDifficulty = true;
OD6S.brawlAttribute = '';
OD6S.chatPath = 'systems/od6s/templates/chat/';
OD6S.wildDieOneDefault = 0;
OD6S.wildDieOneAuto = 0;
OD6S.grenadeDamageDice = false;
OD6S.highlightEffects = false;
OD6S.randomHitLocations = false;
OD6S.mapRange = false;
OD6S.meleeDifficulty = false;
OD6S.baseRangedAttackDifficulty = 10;
OD6S.baseMeleeAttackDifficulty = 10;
OD6S.baseBrawlAttackDifficulty = 10;
OD6S.defenseLock = false;
OD6S.currencyName = "OD6S.CHAR_CREDITS";
OD6S.fatePointRound = false;
OD6S.fatePointClimactic = false;
OD6S.woundConfig = 0;
OD6S.bodyPointsName = "OD6S.BODY_POINTS";
OD6S.highHitDamage = false;
OD6S.autoOpposed = false;
OD6S.autoPromptPlayerResistance = false;
OD6S.autoSkillUsed = false;
OD6S.pipsPerDice = 3;
OD6S.speciesMaxDice = 5;
OD6S.speciesMinDice = 1;
OD6S.flatSkills = false;
OD6S.specLink = true;
OD6S.skillUsed = true;
OD6S.cost = 0;
OD6S.fundsFate = false;
OD6S.showSkillSpecialization = true;
OD6S.specializationDice = false;
OD6S.specStartingPipsPerDie = 3;
OD6S.channelSkillName = "OD6S.METAPHYSICS_SKILL_CHANNEL";
OD6S.senseSkillName = "OD6S.METAPHYSICS_SKILL_SENSE";
OD6S.transformSkillName = "OD6S.METAPHYSICS_SKILL_TRANSFORM";
OD6S.trackStuns = false;
OD6S.stunDamageIncrement = true;
OD6S.randomDifficlty = false;
OD6S.hideExplosiveTemplates = true;
OD6S.meleeRange = false;
OD6S.baseBrawlAttackDifficultyLevel = 'OD6S.DIFFICULTY_VERY_EASY';
OD6S.baseMeleeAttackDifficultyLevel = 'OD6S.DIFFICULTY_VERY_EASY';
OD6S.stunScaling = false;
OD6S.woundScaling = false;
OD6S.speciesLabelName = "OD6S.CHAR_SPECIES"
OD6S.typeLabel = "OD6S.CHAR_TYPE"
//MiscRulesOptions variables
OD6S.highHitDamageMultiplier = 5;
OD6S.highHitDamagePipsOrDice = false; //false = pips, ture = dice
OD6S.highHitDamageRound = false; //false = round up, true = round down.
OD6S.advanceCostAttribute = 10;
OD6S.advanceCostSkill = 1;
OD6S.advanceCostMetaphysicsSkill = 2;
OD6S.advanceCostSpecialization = .5;
OD6S.resistanceOption = false;
OD6S.resistanceSkill = "Stamina";
OD6S.resistanceMultiplier = 1;
OD6S.resistanceRound = false; //false = round up, true = round down.
OD6S.strDamRound = false;
OD6S.strDamMultiplier = 0.5;
OD6S.strDamSkill = "Lift";
OD6S.od6Bonus = false;

OD6S.deletingMessage = false;

//MiscRulesOptions variables.

OD6S.weaponDamage = weaponDamage;

OD6S.armorDamage = armorDamage;

OD6S.characterPointLimits = {
    skill: 2,
    attribute: 2,
    specialization: 5,
    dodge: 5,
    parry: 5,
    block: 5,
    dr: 5,
    initiative: 5
}

OD6S.explosives = [
    "OD6S.EXPLOSIVE_THROWN",
    // TODO: "OD6S.EXPLOSIVE_TIMER",
    // TODO: "OD6S.EXPLOSIVE_TRIGGER"
]

OD6S.deadlinessLevel = {
    "character": 3,
    "creature": 3,
    "npc": 3
}

OD6S.wildDieResult = {
    0: "OD6S.WILD_RESULT_ONE",
    1: "OD6S.WILD_DIE_NONE",
    2: "OD6S.REMOVE_HIGHEST_DIE",
    3: "OD6S.COMPLICATION"
}

OD6S.actorMasks = {
    "character": 0,
    "npc": 1,
    "creature": 2,
    "vehicle": 3,
    "starship": 4
}

OD6S.equippable = [
    "weapon",
    "armor",
    "gear",
    "vehicle-weapon",
    "vehicle-gear",
    "starship-weapon",
    "starship-gear"
]

OD6S.cargo_hold = [
    "weapon",
    "armor",
    "gear",
    "vehicle-weapon",
    "vehicle-gear",
    "starship-weapon",
    "starship-gear"
]

OD6S.deadliness = deadliness;

OD6S.damage = damage;

OD6S.bodyPointLevels = {
    "OD6S.WOUNDS_HEALTHY": 9999,
    "OD6S.WOUNDS_STUNNED": 81,
    "OD6S.WOUNDS_WOUNDED": 60,
    "OD6S.WOUNDS_SEVERELY_WOUNDED": 40,
    "OD6S.WOUNDS_INCAPACITATED": 20,
    "OD6S.WOUNDS_MORTALLY_WOUNDED": 10,
    "OD6S.WOUNDS_DEAD": 1
}

OD6S.vehicle_damage = vehicleDamage;

OD6S.vehicle_speeds = {
    "stopped": {
        "name": "OD6S.VEHICLE_SPEED_STOPPED",
        "damage": 6,
        "mod": 0
    },
    "cautious": {
        "name": "OD6S.VEHICLE_SPEED_CAUTIOUS",
        "damage": 12,
        "mod": 0
    },
    "cruise": {
        "name": "OD6S.VEHICLE_SPEED_CRUISE",
        "damage": 18,
        "mod": 0
    },
    "high": {
        "name": "OD6S.VEHICLE_SPEED_HIGH",
        "damage": 24,
        "mod": 5
    },
    "all_out": {
        "name": "OD6S.VEHICLE_SPEED_ALL_OUT",
        "damage": 30,
        "mod": 10
    }
}

OD6S.collision_types = {
    "head_on": {
        "name": "OD6S.VEHICLE_HEAD_ON",
        "score": 9
    },
    "sidewipe": {
        "name": "OD6S.VEHICLE_SIDESWIPE",
        "score": -9
    },
    "rear_end": {
        "name": "OD6S.VEHICLE_REAR_END",
        "score": -9
    },
    "t_bone": {
        "name": "OD6S.VEHICLE_T_BONE",
        "score": 0
    }
}

OD6S.weaponTypes = [
    "OD6S.RANGED",
    "OD6S.MELEE",
    "OD6S.MISSILE",
    "OD6S.THROWN",
    "OD6S.EXPLOSIVE"
]

OD6S.weaponTypeKeys = [
    {
        "key": "OD6S.RANGED",
        "name": "Ranged"
    },
    {
        "key": "OD6S.MELEE",
        "name": "Melee"
    },
    {
        "key": "OD6S.MISSILE",
        "name": "Missile"
    },
    {
        "key": "OD6S.THROWN",
        "name": "Thrown"
    },
    {
        "key": "OD6S.EXPLOSIVE",
        "name": "Explosive"
    }
]

OD6S.meleeDifficulties = [
    "OD6S.DIFFICULTY_VERY_EASY",
    "OD6S.DIFFICULTY_EASY",
    "OD6S.DIFFICULTY_MODERATE",
    "OD6S.DIFFICULTY_DIFFICULT",
    "OD6S.DIFFICULTY_VERY_DIFFICULT",
    "OD6S.DIFFICULTY_HEROIC",
]

OD6S.actions = actions;

OD6S.vehicle_actions = vehicleActions;

OD6S.difficulty = {
    "OD6S.DIFFICULTY_UNKNOWN": {
        "min": 0,
        "max": 0,
        "dice": 0
    },
    "OD6S.DIFFICULTY_CUSTOM": {
        "min": 0,
        "max": 0,
        "dice": 0
    },
    "OD6S.DIFFICULTY_AUTOMATIC": {
        "min": 0,
        "max": 0,
        "dice": 0
    },
    "OD6S.DIFFICULTY_VERY_EASY": {
        "min": 1,
        "max": 5,
        "dice": 1
    },
    "OD6S.DIFFICULTY_EASY": {
        "min": 6,
        "max": 10,
        "dice": 2
    },
    "OD6S.DIFFICULTY_MODERATE": {
        "min": 11,
        "max": 15,
        "dice": 4
    },
    "OD6S.DIFFICULTY_DIFFICULT": {
        "min": 16,
        "max": 20,
        "dice": 6
    },
    "OD6S.DIFFICULTY_VERY_DIFFICULT": {
        "min": 21,
        "max": 25,
        "dice": 8
    },
    "OD6S.DIFFICULTY_HEROIC": {
        "min": 26,
        "max": 30,
        "dice": 9
    },
    "OD6S.DIFFICULTY_LEGENDARY": {
        "min": 31,
        "max": 40,
        "dice": 10
    }
}

OD6S.difficultyShort = {
    "VE": "OD6S.DIFFICULTY_VERY_EASY",
    "E": "OD6S.DIFFICULTY_EASY",
    "M": "OD6S.DIFFICULTY_MODERATE",
    "D": "OD6S.DIFFICULTY_DIFFICULT",
    "VD": "OD6S.DIFFICULTY_VERY_DIFFICULT",
    "H": "OD6S.DIFFICULTY_HEROIC",
    "L": "OD6S.DIFFICULTY_LEGENDARY"
}

OD6S.terrain_difficulty = {
    "OD6S.TERRAIN_EASY": {
        "mod": 0
    },
    "OD6S.TERRAIN_MODERATE": {
        "mod": 5
    },
    "OD6S.TERRAIN_ROUGH": {
        "mod": 10
    },
    "OD6S.TERRAIN_VERY_ROUGH": {
        "mod": 15
    },
    "OD6S.TERRAIN_HAZARDOUS": {
        "mod": 20
    },
    "OD6S.TERRAIN_VERY_HAZARDOUS": {
        "mod": 25
    }
}

OD6S.result = {
    "OD6S.FAILURE": {
        "description": "OD6S.FAILURE",
        "difference": -1
    },
    "OD6S.RESULT_MINIMAL": {
        "description": "OD6S.RESULT_MINIMAL_DESCRIPTION",
        "difference": 0
    },
    "OD6S.RESULT_SOLID": {
        "description": "OD6S.RESULT_SOLID_DESCRIPTION",
        "difference": 1
    },
    "OD6S.RESULT_GOOD": {
        "description": "OD6S.RESULT_GOOD_DESCRIPTION",
        "difference": 5
    },
    "OD6S.RESULT_SUPERIOR": {
        "description": "OD6S.RESULT_SUPERIOR_DESCRIPTION",
        "difference": 9
    },
    "OD6S.RESULT_SPECTACULAR": {
        "description": "OD6S.RESULT_SPECTACULAR_DESCRIPTION",
        "difference": 13
    },
    "OD6S.RESULT_INCREDIBLE": {
        "description": "OD6S.RESULT_INCREDIBLE_DESCRIPTION",
        "difference": 16
    }
}

OD6S.cover = {
    "OD6S.COVER_SMOKE": {
        "OD6S.NONE": {
            "modifier": 0
        },
        "OD6S.COVER_LIGHT_SMOKE": {
            "modifier": 3
        },
        "OD6S.COVER_THICK_SMOKE": {
            "modifier": 6
        },
        "OD6S.COVER_VERY_THICK_SMOKE": {
            "modifier": 12
        },
    },
    "OD6S.COVER_LIGHT": {
        "OD6S.COVER_LIGHT_NONE": {
            "modifier": 0
        },
        "OD6S.COVER_POOR_LIGHT": {
            "modifier": 3
        },
        "OD6S.COVER_MOONLIGHT_NIGHT": {
            "modifier": 6
        },
        "OD6S.COVER_COMPLETE_DARKNESS": {
            "modifier": 12
        },
    },
    "OD6S.COVER": {
        "OD6S.NONE": {
            "modifier": 0
        },
        "OD6S.COVER_QUARTER": {
            "modifier": 3
        },
        "OD6S.COVER_HALF": {
            "modifier": 6
        },
        "OD6S.COVER_THREE_QUARTERS": {
            "modifier": 12
        },
        "OD6S.COVER_FULL": {
            "modifier": 0
        }
    }
}


// Other modifiers besides range and cover
OD6S.calledShot = {
    "OD6S.CALLED_SHOT_NONE": {
        "modifier": 0,
        "damage": 0
    },
    "OD6S.CALLED_SHOT_LARGE": {
        "modifier": 3,
        "damage": 0

    },
    "OD6S.CALLED_SHOT_MEDIUM": {
        "modifier": 12,
        "damage": 0
    },
    "OD6S.CALLED_SHOT_SMALL": {
        "modifier": 24,
        "damage": 0
    },
    "OD6S.CALLED_SHOT_HEAD": {
        "modifier": 5,
        "damage": 12,
    },
    "OD6S.CALLED_SHOT_HEART": {
        "modifier": 15,
        "damage": 12,
    },
    "OD6S.CALLED_SHOT_TORSO": {
        "modifier": 0,
        "damage": 0,
    },
    "OD6S.CALLED_SHOT_ARM": {
        "modifier": 5,
        "damage": -2,
    },
    "OD6S.CALLED_SHOT_LEG": {
        "modifier": 5,
        "damage": -1,
    },
    "OD6S.CALLED_SHOT_HAND": {
        "modifier": 15,
        "damage": -2,
    }
}

OD6S.gravity = {
    "OD6S.GRAVITY_STANDARD": {
        "modifier": 0
    },
    "OD6S.GRAVITY_LOW": {
        "modifier": -3
    },
    "OD6S.GRAVITY_NONE": {
        "modifier": -6
    },
    "OD6S.GRAVITY_HEAVY": {
        "modifier": 9
    }
}

// Other modifiers from conditions, etc.
OD6S.misc = {
    "OD6S.MISC": {
        "modifier": 0
    }
}

// attack: subtraction or addition to hit difficulty (negative numbers are in effect a bonus)
// damage: bonus or penalty to damage
// multi: whether an attack needs a ROF selection by the character for number of shots in a round
OD6S.rangedAttackOptions = {
    "OD6S.ATTACK_STANDARD": {
        "attack": 0,
        "damage": 0,
        "multi": false
    },
    "OD6S.ATTACK_RANGED_SINGLE_FIRE_AS_MULTI": {
        "attack": -3,
        "damage": +3,
        "multi": true
    },
    "OD6S.ATTACK_RANGED_FULL_AUTO": {
        "attack": -6,
        "damage": 6,
        "multi": false
    },
    "OD6S.ATTACK_RANGED_SWEEP": {
        "attack": -6,
        "damage": -9,
        "multi": false
    },
    "OD6S.ATTACK_RANGED_BURST_FIRE_AS_SINGLE": {
        "attack": 0,
        "damage": -6,
        "multi": false
    }
}

OD6S.meleeAttackOptions = {
    "OD6S.ATTACK_STANDARD": {
        "attack": 0,
        "damage": 0,
        "multi": false
    },
    "OD6S.ATTACK_ALL_OUT": {
        "attack": -6,
        "damage": 3
    },
    "OD6S.ATTACK_LUNGE": {
        "attack": 3,
        "damage": -3
    },
    "OD6S.ATTACK_KNOCKDOWN_TRIP": {
        "attack": 6,
        "damage": 0
    },
    "OD6S.ATTACK_PUSH": {
        "attack": 3,
        "damage": 0
    }
}

OD6S.brawlAttackOptions = {
    "OD6S.ATTACK_STANDARD": {
        "attack": 0,
        "damage": 0,
        "multi": false
    },
    "OD6S.ATTACK_ALL_OUT": {
        "attack": -6,
        "damage": 3
    },
    "OD6S.ATTACK_GRAB": {
        "attack": 9,
        "damage": 0
    },
    "OD6S.ATTACK_LUNGE": {
        "attack": 3,
        "damage": -3
    },
    "OD6S.ATTACK_KNOCKDOWN_TRIP": {
        "attack": 6,
        "damage": 0
    },
    "OD6S.ATTACK_PUSH": {
        "attack": 3,
        "damage": 0
    },
    "OD6S.ATTACK_SWEEP": {
        "attack": -6,
        "damage": -9
    },
    "OD6S.ATTACK_TACKLE": {
        "attack": 3,
        "damage": 0
    }
}

OD6S.attributes = attributes;

OD6S.ranges = {
    "OD6S.RANGE_POINT_BLANK_SHORT": {
        "name": "OD6S.RANGE_POINT_BLANK",
        "difficulty": -5,
        "map": "OD6S.DIFFICULTY_VERY_EASY",
        "item": "pb"
    },
    "OD6S.RANGE_SHORT_SHORT": {
        "name": "OD6S.RANGE_SHORT",
        "difficulty": 0,
        "map": "OD6S.DIFFICULTY_EASY",
        "item": "short"
    },
    "OD6S.RANGE_MEDIUM_SHORT": {
        "name": "OD6S.RANGE_MEDIUM",
        "difficulty": 5,
        "map": "OD6S.DIFFICULTY_MODERATE",
        "item": "medium"
    },
    "OD6S.RANGE_LONG_SHORT": {
        "name": "OD6S.RANGE_LONG",
        "difficulty": 10,
        "map": "OD6S.DIFFICULTY_DIFFICULT",
        "item": "long"
    }
}

OD6S.damageTypes = damageTypes;

OD6S.cyberneticsLocations = [
    "OD6S.HEAD",
    "OD6S.RIGHT_ARM",
    "OD6S.LEFT_ARM",
    "OD6S.BODY",
    "OD6S.RIGHT_LEG",
    "OD6S.LEFT_LEG"
]

OD6S.allowedItemTypes = {
    "container": [
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear"
    ],
    "character": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation",
        "character-template",
        "species-template",
    ],
    "npc": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "species-template",
    ],
    "creature": [
        "skill",
        "specialization",
        "advantage",
        "disadvantage",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic"
    ],
    "vehicle": [
        "vehicle-weapon",
        "vehicle-gear"
    ],
    "starship": [
        "starship-weapon",
        "starship-gear"
    ]
}

OD6S.actorTypeLabels = {
    "character": "ACTOR.TypeCharacter",
    "creature": "ACTOR.TypeCreature",
    "npc": "ACTOR.TypeNpc",
    "starship": "ACTOR.TypeStarship",
    "vehicle": "ACTOR.TypeVehicle"
}

OD6S.templateItemTypes = {
    "character-template": [
        "skill",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation"
    ],
    "species-template": [
        "specialability"
    ],
    "item-group": [
        "skill",
        "specialability",
        "armor",
        "weapon",
        "gear",
        "cybernetic",
        "manifestation",
        "vehicle-weapon",
        "vehicle-gear",
        "starship-weapon",
        "starship-gear"
    ]
}

OD6S.itemLabels = {
    "skill": "OD6S.SKILL",
    "specialization": "OD6S.SPECIALIZATION",
    "advantage": "OD6S.ADVANTAGE",
    "disadvantage": "OD6S.DISADVANTAGE",
    "specialability": "OD6S.SPECIAL_ABILITY",
    "armor": "OD6S.ARMOR",
    "weapon": "OD6S.WEAPON",
    "gear": "OD6S.GEAR",
    "cybernetic": "OD6S.CYBERNETICS",
    "vehicle": "OD6S.VEHICLE",
    "manifestation": "OD6S.MANIFESTATION",
    "character-template": "OD6S.CHARACTER_TEMPLATE",
    "action": "OD6S.ACTION",
    "species-template": "ITEM.TypeSpecies-template",
    "starship-gear": "ITEM.TypeStarship-gear",
    "starship-weapon": "ITEM.TypeStarship-weapon",
    "vehicle-gear": "ITEM.TypeVehicle-gear",
    "vehicle-weapon": "ITEM.TypeVehicle-weapon"
}

OD6S.chatTemplates = {
    "generic": OD6S.chatPath + "generic.html",
    "roll": OD6S.chatPath + "roll.html",
    "opposed": OD6S.chatPath + "opposed.html",
    "damageresult": OD6S.chatPath + "damageresult.html",
    "explosive": OD6S.chatPath + "explosive.html",
    "explosive-button": OD6S.chatPath + "explosive-button.html",
    "range": OD6S.chatPath + "range.html"
}

OD6S.data_tab = {
    "defense": {
        "dodge": "OD6S.DODGE",
        "parry": "OD6S.PARRY",
        "block": "OD6S.BLOCK"
    },
    "offense": {
        "ranged": "OD6S.RANGED",
        "melee": "OD6S.MELEE",
        "brawl": "OD6S.BRAWL",
        "initiative": "OD6S.INITIATIVE",
        "strengthdamage": "OD6S.STRENGTH_DAMAGE",
        "pr": "OD6S.PHYSICAL_RESISTANCE",
        "er": "OD6S.ENERGY_RESISTANCE",
        "move": "OD6S.MOVE"
    }
}

OD6S.hiddenStatusEffects = [
  "stunned",
  "wounded",
  "severely_wounded",
  "incapacitated",
  "mortally_wounded"
]

OD6S.statusEffects = statusEffects;

OD6S.hitLocations = {
    0: "OD6S.LOCATION_RIGHT_HAND",
    1: "OD6S.LOCATION_LEFT_HAND",
    2: "OD6S.LOCATION_RIGHT_LEG",
    3: "OD6S.LOCATION_RIGHT_FOOT",
    4: "OD6S.LOCATION_LEFT_LEG",
    5: "OD6S.LOCATION_LEFT_FOOT",
    6: "OD6S.LOCATION_ABDOMEN",
    7: "OD6S.LOCATION_CHEST",
    8: "OD6S.LOCATION_CHEST",
    9: "OD6S.LOCATION_HEAD"
}

OD6S.initiative = {
    "type": "roll",
    "reroll": false,
    "reroll_npc": false,
    "reroll_character": false,
    "dsn": false,
    "attribute": "per",
}

OD6S.woundsId = {
  'OD6S.WOUNDS_HEALTHY': 'healthy',
  'OD6S.WOUNDS_STUNNED': 'stunned',
  'OD6S.WOUNDS_WOUNDED': 'wounded',
  'OD6S.WOUNDS_SEVERELY_WOUNDED': 'severely_wounded',
  'OD6S.WOUNDS_INCAPACITATED': 'incapacitated',
  'OD6S.WOUNDS_MORTALLY_WOUNDED': 'mortally_wounded',
  'OD6S.WOUNDS_DEAD': 'dead'
}

OD6S.initialAttributes = 54
OD6S.initialSkills = 21
OD6S.initialCharacterPoints = 5
OD6S.initialFatePoints = 1
OD6S.initialMove = 10

OD6S.metaphysicsSkills = [
  OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_CHANNEL,
  OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_SENSE,
  OD6S.CONFIG_CUSTOMIZE_METAPHYSICS_SKILL_TRANSFORM
]

export default OD6S;
