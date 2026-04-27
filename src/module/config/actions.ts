/**
 * Action tables: personal-scale (`actions`) and vehicle-scale
 * (`vehicleActions`). Mounted onto OD6S by `config-od6s.ts`.
 */

export const actions = {
    "ranged_attack": {
        "name": "OD6S.ACTION_RANGED_ATTACK",
        "type": "rangedattack",
        "rollable": true,
        "base": "agi",
        "skill": "",
        "subtype": "rangedattack"
    },
    "melee_attack": {
        "name": "OD6S.ACTION_MELEE_ATTACK",
        "type": "meleeattack",
        "rollable": true,
        "base": "agi",
        "skill": "Melee Combat",
        "subtype": "meleeattack",

    },
    "brawl_attack": {
        "name": "OD6S.ACTION_BRAWL_ATTACK",
        "type": "brawlattack",
        "rollable": true,
        "base": "agi",
        "skill": "Brawling",
        "subtype": "brawlattack",
    },
    "dodge": {
        "name": "OD6S.ACTION_DODGE",
        "type": "dodge",
        "rollable": true,
        "base": "agi",
        "skill": "Dodge",
        "subtype": "dodge",
    },
    "parry": {
        "name": "OD6S.ACTION_PARRY",
        "type": "parry",
        "rollable": true,
        "base": "agi",
        "skill": "OD6S.ACTION_MELEE_PARRY",
        "subtype": "parry",
    },
    "block": {
        "name": "OD6S.ACTION_BLOCK",
        "type": "block",
        "rollable": true,
        "base": "agi",
        "skill": "OD6S.ACTION_BRAWL_BLOCK",
        "subtype": "block",
    },
    "other": {
        "name": "OD6S.ACTION_OTHER",
        "type": "action",
        "rollable": false,
        "subtype": "misc"
    }
};

export const vehicleActions = {
    "ranged_attack": {
        "name": "OD6S.ACTION_VEHICLE_RANGED_ATTACK",
        "type": "vehiclerangedattack",
        "rollable": true,
        "base": "mec"
    },
    "ram": {
        "name": "OD6S.ACTION_VEHICLE_RAM",
        "type": "vehicleramattack",
        "rollable": true,
        "base": "mec"
    },
    "dodge": {
        "name": "OD6S.ACTION_VEHICLE_DODGE",
        "type": "vehicledodge",
        "rollable": true,
        "base": "mec"
    },
    "maneuver": {
        "name": "OD6S.ACTION_VEHICLE_MANEUVER",
        "type": "vehiclemaneuver",
        "rollable": true,
        "base": "mec"
    },
    "sensors": {
        "name": "OD6S.ACTION_VEHICLE_SENSORS",
        "type": "vehiclesensors",
        "base": "mec",
        "skill": "OD6S.SENSORS",
        "rollable": true
    },
    "other": {
        "name": "OD6S.ACTION_VEHICLE_OTHER",
        "type": "action",
        "rollable": false
    }
};
