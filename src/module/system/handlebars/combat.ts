/**
 * Combat-related Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../utilities";

export function registerCombatHelpers() {
    Handlebars.registerHelper('getActions', function () {
        // Return a list of available actions
        return OD6S.actions;
    })

    Handlebars.registerHelper('getWoundLevels', function (type) {
        return OD6S.deadliness[OD6S.deadlinessLevel[type]];
    });

    Handlebars.registerHelper('woundsFromValue', function (value, type) {
        const max = Object.keys(OD6S.deadliness[OD6S.deadlinessLevel[type]]).length;
        if (value > max) {
            return max;
        } else {
            return OD6S.deadliness[OD6S.deadlinessLevel[type]][value].description;
        }
    });

    Handlebars.registerHelper('getDamageTypes', function () {
        return OD6S.damageTypes;
    })

    Handlebars.registerHelper('getDamageType', function (type) {
        return OD6S.damageTypes[type];
    })

    Handlebars.registerHelper('getWeaponTypes', function () {
        return OD6S.weaponTypes;
    })

    Handlebars.registerHelper('getMeleeDamage', function (actor, weapon) {
        return od6sutilities.getMeleeDamage(actor, weapon);
    })

    Handlebars.registerHelper('getActionPenalties', function (actions) {
        // Get penalties associated with the number of actions
        return (actions > 0) ? actions - 1 : 0;
    })

    Handlebars.registerHelper('getWoundPenalties', function (actor) {
        // Get penalties associated with the number of actions
        return od6sutilities.getWoundPenalty(actor)
    })

    Handlebars.registerHelper('getDRScore', function (actor) {
        // Get the actor's total DR
        return (od6sutilities as any).getDamageResistance(actor)
    })

    Handlebars.registerHelper('getAttackOptions', function (type) {
        if (type === 'rangedattack') {
            return OD6S.rangedAttackOptions;
        }

        if (type === 'meleeattack') {
            return OD6S.meleeAttackOptions;
        }

        if (type === 'brawlattack') {
            return OD6S.brawlAttackOptions;
        }

        if (type === 'explosive') {
            return OD6S.explosiveAttackOptions;
        }
    })

    Handlebars.registerHelper('isRanged', function (type) {
        return type !== game.i18n.localize("OD6S.MELEE");
    })

    Handlebars.registerHelper('isExplosive', function (type) {
        return type === game.i18n.localize("OD6S.EXPLOSIVE");
    })

    Handlebars.registerHelper('isExplosiveDice', function (type) {
        return type === game.i18n.localize("OD6S.EXPLOSIVE") &&
            OD6S.grenadeDamageDice;
    })

    Handlebars.registerHelper('isMuscle', function (type) {
        switch (type) {
            case game.i18n.localize("OD6S.THROWN"):
            case game.i18n.localize("OD6S.MISSILE"):
                return true;
            default:
                return false;
        }

    })

    Handlebars.registerHelper('getMeleeDifficulty', function (_type) {
        return OD6S.meleeDifficulty;
    })

    Handlebars.registerHelper('getMeleeDifficultyLevels', function (_type) {
        return OD6S.meleeDifficulties;
    })

    Handlebars.registerHelper('getMapRange', function (_type) {
        return OD6S.mapRange;
    })

    Handlebars.registerHelper('isDefense', function (value) {
        return value === 'dodge' || value === 'parry' || value === 'block' || value === 'vehicledodge';
    })

    Handlebars.registerHelper('useParrySkill', function () {
        return game.settings.get('od6s', 'parry_skills');
    })

    Handlebars.registerHelper('getCover', function (type) {
        return OD6S.cover[type];
    })

    Handlebars.registerHelper('getCalledShot', function () {
        return OD6S.calledShot;
    })

    Handlebars.registerHelper('getGravity', function () {
        return OD6S.gravity;
    })

    Handlebars.registerHelper('isAttack', function (subtype) {
        if (typeof (subtype) === 'undefined') {
            return false;
        } else {
            return subtype.endsWith('attack');
        }
    })

    Handlebars.registerHelper('hitsOrMisses', function (success) {
        return success ? game.i18n.localize('OD6S.HITS') : game.i18n.localize('OD6S.MISSES');
    })

    Handlebars.registerHelper('onSuccess', function (success, roll, target) {
        //Get the level of success and return the message
        let resultMessage = '';
        if (success) {
            const difference = roll - target;
            if (difference < 0) {
                // Actually a failure
                return 'OD6S.FAILURE';
            }
            for (const result in OD6S.result) {
                if (difference >= OD6S.result[result].difference) {
                    resultMessage = result;
                } else {
                    break;
                }
            }
        } else {
            resultMessage = 'OD6S.FAILURE'
        }

        return resultMessage;
    })

    Handlebars.registerHelper('getResultDescription', function (success) {
        return OD6S.result[success].description;
    })

    Handlebars.registerHelper('useWeaponArmorDamage', function () {
        return game.settings.get('od6s','weapon_armor_damage');
    })

    Handlebars.registerHelper('getArmorDamageLevels', function () {
        const levels = {};
        for (const level in OD6S.armorDamage) {
            (levels as any)[level] = OD6S.armorDamage[level].label;
        }
        return levels;
    })

    Handlebars.registerHelper('getWeaponDamageLevels', function () {
        const levels = {};
        for (const level in OD6S.weaponDamage) {
            (levels as any)[level] = OD6S.weaponDamage[level].label;
        }
        return levels;
    })

    Handlebars.registerHelper('getInitiative', function (actor) {
        return actor.system.initiative.score;
    })

    Handlebars.registerHelper('getHitLocation', function (type, location) {

        if (OD6S.randomHitLocations && location !== '') {
            if (type !== 'vehicle' && type !== 'starship') {
                return game.i18n.localize("OD6S.LOCATION") + ":" + " " + game.i18n.localize(location);
            }
        } else {
            return '';
        }
    })

    Handlebars.registerHelper('showWounds', function () {
        return (OD6S.woundConfig < 2);
    })

    Handlebars.registerHelper('showBodyPoints', function () {
        return (OD6S.woundConfig > 0);
    })

    Handlebars.registerHelper('showBodyPointsDamage', function (isVehicle) {
        return (game.settings.get('od6s', 'bodypoints') > 0
            && !isVehicle);
    })

    Handlebars.registerHelper('getBodyPointsLabel', function () {
        return OD6S.bodyPointsName;
    })

    Handlebars.registerHelper('getWoundLevel', function (actor) {
        return actor.getWoundLevelFromBodyPoints();
    })

    Handlebars.registerHelper('showPenalties', function (type) {
        return (type !== 'funds' &&
            type !== 'resistance' &&
            type !== 'incapacitated' &&
            type !== 'mortally_wounded')
    });

    Handlebars.registerHelper('getDifficultyLevels', function () {
        const levels = [];
        levels.push('- -');
        for (const level in OD6S.difficulty) {
            if(OD6S.difficulty[level].max > 0) {
                levels.push(level);
            }
        }
        return levels;
    })

    Handlebars.registerHelper('getDifficulties', function () {
        return OD6S.difficulty;
    })

    Handlebars.registerHelper('getDifficultiesShort', function () {
        return OD6S.difficultyShort;
    })

    Handlebars.registerHelper('getDifficultyFromShort', function () {
        return OD6S.difficulty.filter()
    })

    Handlebars.registerHelper('getRanges', function () {
        return OD6S.ranges;
    })

    Handlebars.registerHelper('rangeToItem', function (range) {
        // @ts-expect-error
        return (Object!.keys(OD6S.ranges).find(key => object[key].name === range) as any).item;
    })

    Handlebars.registerHelper('getStrRange', function (messageId, range, type) {
        const message = game.messages.get(messageId);
        const ranges = message!.getFlag('od6s', type);
        const rangeKey = Object.keys(OD6S.ranges).find(key => OD6S.ranges[key].name === range);
        // @ts-expect-error
        const itemKey = OD6S.ranges[rangeKey].item;
        return ranges[itemKey];
    })
}
