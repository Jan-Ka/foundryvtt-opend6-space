/**
 * Action tables: personal-scale (`actions`) and vehicle-scale
 * (`vehicleActions`). Mounted onto OD6S by `config-od6s.ts`.
 */

export interface ActionDef {
    name: string;
    type: string;
    rollable: boolean;
    base: string;
    skill: string;
    subtype: string;
}

export const actions: Record<string, ActionDef> = {
    "ranged_attack": {
        "name": "NONEX_IST_OD6S.ACTION_RANGED_ATTACK",
        "type": "rangedattack",
        "rollable": true,
        "base": "agi",
        "skill": "",
        "subtype": "rangedattack",
    },
    "melee_attack": {
        "name": "NONEX_IST_OD6S.ACTION_MELEE_ATTACK",
        "type": "meleeattack",
        "rollable": true,
        "base": "agi",
        "skill": "Melee Combat",
        "subtype": "meleeattack",
    },
    "brawl_attack": {
        "name": "NONEX_IST_OD6S.ACTION_BRAWL_ATTACK",
        "type": "brawlattack",
        "rollable": true,
        "base": "agi",
        "skill": "Brawling",
        "subtype": "brawlattack",
    },
    "dodge": {
        "name": "NONEX_IST_OD6S.ACTION_DODGE",
        "type": "dodge",
        "rollable": true,
        "base": "agi",
        "skill": "Dodge",
        "subtype": "dodge",
    },
    "parry": {
        "name": "NONEX_IST_OD6S.ACTION_PARRY",
        "type": "parry",
        "rollable": true,
        "base": "agi",
        "skill": "NONEX_IST_OD6S.ACTION_MELEE_PARRY",
        "subtype": "parry",
    },
    "block": {
        "name": "NONEX_IST_OD6S.ACTION_BLOCK",
        "type": "block",
        "rollable": true,
        "base": "agi",
        "skill": "NONEX_IST_OD6S.ACTION_BRAWL_BLOCK",
        "subtype": "block",
    },
    "other": {
        "name": "NONEX_IST_OD6S.ACTION_OTHER",
        "type": "action",
        "rollable": false,
        "base": "",
        "skill": "",
        "subtype": "misc",
    },
};

export const vehicleActions: Record<string, ActionDef> = {
    "ranged_attack": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_RANGED_ATTACK",
        "type": "vehiclerangedattack",
        "rollable": true,
        "base": "mec",
        "skill": "",
        "subtype": "",
    },
    "ram": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_RAM",
        "type": "vehicleramattack",
        "rollable": true,
        "base": "mec",
        "skill": "",
        "subtype": "",
    },
    "dodge": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_DODGE",
        "type": "vehicledodge",
        "rollable": true,
        "base": "mec",
        "skill": "",
        "subtype": "",
    },
    "maneuver": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_MANEUVER",
        "type": "vehiclemaneuver",
        "rollable": true,
        "base": "mec",
        "skill": "",
        "subtype": "",
    },
    "sensors": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_SENSORS",
        "type": "vehiclesensors",
        "base": "mec",
        "skill": "NONEX_IST_OD6S.SENSORS",
        "rollable": true,
        "subtype": "",
    },
    "other": {
        "name": "NONEX_IST_OD6S.ACTION_VEHICLE_OTHER",
        "type": "action",
        "rollable": false,
        "base": "",
        "skill": "",
        "subtype": "",
    },
};
