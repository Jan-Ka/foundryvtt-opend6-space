/**
 * Wound-level tables keyed by deadliness setting (1-5). Each entry maps
 * a wound count to a wound-level description, penalty, and core wound name.
 * Mounted onto `OD6S.deadliness` by `config-od6s.ts`.
 */
const deadliness = {
    1: {
        0: {
            "description": "OD6S.WOUNDS_HEALTHY",
            "penalty": 0,
            "core": "OD6S.WOUNDS_HEALTHY"
        },
        1: {
            "description": "OD6S.WOUNDS_STUNNED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_STUNNED"
        },
        2: {
            "description": "OD6S.WOUNDS_WOUNDED_1",
            "penalty": 0,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        3: {
            "description": "OD6S.WOUNDS_WOUNDED_2",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        4: {
            "description": "OD6S.WOUNDS_WOUNDED_3",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        5: {
            "description": "OD6S.WOUNDS_SEVERELY_WOUNDED",
            "penalty": 2,
            "core": "OD6S.WOUNDS_SEVERELY_WOUNDED"
        },
        6: {
            "description": "OD6S.WOUNDS_INCAPACITATED",
            "penalty": 3,
            "core": "OD6S.WOUNDS_INCAPACITATED"
        },
        7: {
            "description": "OD6S.WOUNDS_MORTALLY_WOUNDED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_MORTALLY_WOUNDED"
        },
        8: {
            "description": "OD6S.WOUNDS_DEAD",
            "penalty": 0,
            "core": "OD6S.WOUNDS_DEAD"
        },
    },
    2: {
        0: {
            "description": "OD6S.WOUNDS_HEALTHY",
            "penalty": 0,
            "core": "OD6S.WOUNDS_HEALTHY"
        },
        1: {
            "description": "OD6S.WOUNDS_STUNNED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_STUNNED"
        },
        2: {
            "description": "OD6S.WOUNDS_WOUNDED_1",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        3: {
            "description": "OD6S.WOUNDS_WOUNDED_2",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        4: {
            "description": "OD6S.WOUNDS_SEVERELY_WOUNDED",
            "penalty": 2,
            "core": "OD6S.WOUNDS_SEVERELY_WOUNDED"
        },
        5: {
            "description": "OD6S.WOUNDS_INCAPACITATED",
            "penalty": 3,
            "core": "OD6S.WOUNDS_INCAPACITATED"
        },
        6: {
            "description": "OD6S.WOUNDS_MORTALLY_WOUNDED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_MORTALLY_WOUNDED"
        },
        7: {
            "description": "OD6S.WOUNDS_DEAD",
            "penalty": 0,
            "core": "OD6S.WOUNDS_DEAD"
        },
    },
    3: {
        0: {
            "description": "OD6S.WOUNDS_HEALTHY",
            "penalty": 0,
            "core": "OD6S.WOUNDS_HEALTHY"
        },
        1: {
            "description": "OD6S.WOUNDS_STUNNED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_STUNNED"
        },
        2: {
            "description": "OD6S.WOUNDS_WOUNDED",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        3: {
            "description": "OD6S.WOUNDS_SEVERELY_WOUNDED",
            "penalty": 2,
            "core": "OD6S.WOUNDS_SEVERELY_WOUNDED"
        },
        4: {
            "description": "OD6S.WOUNDS_INCAPACITATED",
            "penalty": 3,
            "core": "OD6S.WOUNDS_INCAPACITATED"
        },
        5: {
            "description": "OD6S.WOUNDS_MORTALLY_WOUNDED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_MORTALLY_WOUNDED"
        },
        6: {
            "description": "OD6S.WOUNDS_DEAD",
            "penalty": 0,
            "core": "OD6S.WOUNDS_DEAD"
        },
    },
    4: {
        0: {
            "description": "OD6S.WOUNDS_HEALTHY",
            "penalty": 0,
            "core": "OD6S.WOUNDS_HEALTHY"
        },
        1: {
            "description": "OD6S.WOUNDS_WOUNDED",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        2: {
            "description": "OD6S.WOUNDS_SEVERELY_WOUNDED",
            "penalty": 2,
            "core": "OD6S.WOUNDS_SEVERELY_WOUNDED"
        },
        3: {
            "description": "OD6S.WOUNDS_INCAPACITATED",
            "penalty": 3,
            "core": "OD6S.WOUNDS_INCAPACITATED"
        },
        4: {
            "description": "OD6S.WOUNDS_MORTALLY_WOUNDED",
            "penalty": 0,
            "core": "OD6S.WOUNDS_MORTALLY_WOUNDED"
        },
        5: {
            "description": "OD6S.WOUNDS_DEAD",
            "penalty": 0,
            "core": "OD6S.WOUNDS_DEAD"
        },
    },
    5: {
        0: {
            "description": "OD6S.WOUNDS_HEALTHY",
            "penalty": 0,
            "core": "OD6S.WOUNDS_HEALTHY"
        },
        1: {
            "description": "OD6S.WOUNDS_WOUNDED",
            "penalty": 1,
            "core": "OD6S.WOUNDS_WOUNDED"
        },
        2: {
            "description": "OD6S.WOUNDS_SEVERELY_WOUNDED",
            "penalty": 2,
            "core": "OD6S.WOUNDS_SEVERELY_WOUNDED"
        },
        3: {
            "description": "OD6S.WOUNDS_MORTALLY_WOUNDED",
            "penalty": 3,
            "core": "OD6S.WOUNDS_MORTALLY_WOUNDED"
        },
        4: {
            "description": "OD6S.WOUNDS_DEAD",
            "penalty": 0,
            "core": "OD6S.WOUNDS_DEAD"
        },
    }
};

export default deadliness;
