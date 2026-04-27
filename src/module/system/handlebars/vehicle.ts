/**
 * Vehicle-related Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../utilities";

export function registerVehicleHelpers() {
    Handlebars.registerHelper('getPilotManeuverTotal', function (actor) {
        let found = false;
        let score = actor.system.maneuverability.score;
        if (!found) {
            const spec = actor.items.find((i: any) => i.type === "specialization" &&
                i.name === actor.system.specialization.value);
            if (typeof (spec) !== 'undefined') {
                score = (+score) + (+spec.system.score) + (actor.system.attributes[actor.system.attribute.value].score)
                found = true;
            }
        }
        if (!found) {
            const skill = actor.items.find((i: any) => i.type === "skill" && i.name === actor.system.skill.value);
            if (typeof (skill) !== 'undefined') {
                score = (+score) + (+skill.system.score) + (actor.system.attributes[actor.system.attribute.value].score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[actor.system.attribute.value].score);
        }
        return score;
    })

    Handlebars.registerHelper('getPilotSensorsTotal', function (actor, sensor) {
        let found = false;
        let score = actor.system.sensors.types[sensor].score;
        if (!found) {
            const skillType = game.i18n.localize('OD6S.SENSORS');
            const skill =
                actor.items.find((i: any) => i.type === "skill" && i.name === skillType);
            if (typeof (skill) !== 'undefined') {
                score = (+score) + (+skill.system.score) + (actor.system.attributes['mec'].score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[actor.system.attribute.value].score);
        }
        return score;
    })

    Handlebars.registerHelper('getPilotWeaponTotal', function (actor, weapon) {
        let found = false;
        let score = weapon.system.fire_control.score;
        if (!found) {
            const spec = actor.items.find((i: any) => i.type === "specialization" &&
                i.name === weapon.system.stats.specialization);
            if (typeof (spec) !== 'undefined') {
                score = (+score) + (+spec.system.score) + (actor.system.attributes[weapon.system.stats.attribute].score)
                found = true;
            }
        }
        if (!found) {
            const skill = actor.items.find((i: any) => i.type === "skill" && i.name === weapon.system.stats.skill);
            if (typeof (skill) !== 'undefined') {
                score = (+score) + (+skill.system.score) + (actor.system.attributes[weapon.system.stats.attribute].score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[weapon.system.stats.attribute].score);
        }
        const dice = od6sutilities.getDiceFromScore(score);
        return dice.dice + "D+" + dice.pips;
    })

    Handlebars.registerHelper('getSensorsConfig', function () {
        return game.settings.get('od6s', 'sensors');
    })

    Handlebars.registerHelper('getSensorTotal', function (actor, sensorScore) {
        return od6sutilities.getSensorTotal(actor, sensorScore);
    })

    Handlebars.registerHelper('getVehicleActions', function (actor) {
        // Return a list of available vehicle actions
        if (actor.type === 'character' || actor.type === 'npc') {
            if (typeof (actor.system.vehicle.name) != 'undefined') {
                const actions = {...OD6S.vehicle_actions};
                if (actor.system.vehicle.shields.value === 0) {
                    delete actions['shields'];
                }
                if (!actor.system.vehicle.sensors.value || actor.system.vehicle.type === 'starship') {
                    delete actions['sensors'];
                }
                return actions;
            }
        }
    })

    Handlebars.registerHelper('getVehicleDamageLevels', function () {
        return OD6S.vehicle_damage;
    })

    Handlebars.registerHelper('getVehicleSpeeds', function () {
        return OD6S.vehicle_speeds;
    })

    Handlebars.registerHelper('getCollisionTypes', function () {
        return OD6S.collision_types;
    })

    Handlebars.registerHelper('getTerrainDifficulties', function () {
        if (OD6S.vehicleDifficulty) {
            return OD6S.terrain_difficulty;
        } else {
            return Object.fromEntries(
                Object.entries(OD6S.difficulty).filter(([key]) => key !== 'OD6S.DIFFICULTY_UNKNOWN' &&
                    key !== 'OD6S.DIFFICULTY_CUSTOM'));
        }
    })

    Handlebars.registerHelper('sumManeuverability', function (actor, m, type) {
        if (typeof (m) === 'undefined' || Object.keys(m).length === 0) return;
        const data: any = {};
        const skillTypes = ["specialization", "skill", 'attribute']
        data.score = 0;
        data.skillScore = 0;
        data.skill = ''

        // Look for a spec, then a skill, then finally attribute
        for (const s of skillTypes) {
            if (s === 'specialization' && typeof (m.specialization.value) !== "undefined" && m.specialization.value !== '') {
                const spec = actor.items.find((spec: any) => spec.name === m.specialization.value && spec.type === 'specialization');
                if (spec) {
                    data.score = m.maneuverability.score + spec.system.score + actor.system.attributes[spec.system.attribute].score;
                    data.skillScore = spec.system.score + actor.system.attributes[spec.system.attribute].score;
                    data.skill = spec.name;
                    break;
                }
            }
            if (s === 'skill' && typeof (m.skill.value) !== "undefined" && m.skill.value !== '') {
                const skill = actor.items.find((skill: any) => skill.name === m.skill.value && skill.type === 'skill');
                if (skill) {
                    data.score = m.maneuverability.score + skill.system.score + actor.system.attributes[skill.system.attribute].score;
                    data.skillScore = skill.system.score + actor.system.attributes[skill.system.attribute].score;
                    data.skill = skill.name;
                    break;
                }
            }
            if (s === 'attribute') {
                data.score = actor.system.attributes[m.attribute.value].score + m.maneuverability.score;
                data.skillScore = actor.system.attributes[m.attribute.value].score;
                data.skill = game.i18n.localize(actor.system.attributes[m.attribute.value].label);
            }
        }
        return data[type];
    })

    Handlebars.registerHelper('isCrewMember', function (actor) {
        return actor.isCrewMember();
    })

    Handlebars.registerHelper('getInterstellarDriveName', function () {
        return OD6S.interstellarDriveName;
    })

    Handlebars.registerHelper('getToughnessName', function (type) {
        if (type === 'vehicle') return game.i18n.localize(OD6S.vehicleToughnessName);
        if (type === 'starship') return game.i18n.localize(OD6S.starshipToughnessName);
    })
}
