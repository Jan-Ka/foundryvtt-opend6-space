/**
 * Vehicle-related Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";
import {od6sutilities} from "../utilities";

/**
 * Helper-input shape: a pilot/crew actor merged with its vehicle snapshot.
 * Properties mirror runtime usage in these helpers.
 */
type VehicleHelperActor = Actor & {
    system: OD6SVehicleSystem & OD6SCharacterSystem & Record<string, unknown>;
    isCrewMember: () => boolean;
};

type VehicleWeaponWithStats = OD6SVehicleWeaponItem & {
    system: { stats: { attribute: string; skill: string; specialization: string } };
};

export function registerVehicleHelpers() {
    Handlebars.registerHelper('getPilotManeuverTotal', function (actor: VehicleHelperActor) {
        let found = false;
        let score = actor.system.maneuverability.score;
        if (!found) {
            const spec = actor.items.find((i: Item) => i.type === "specialization" &&
                i.name === actor.system.specialization.value);
            if (typeof (spec) !== 'undefined') {
                const specSys = spec.system as OD6SSpecializationItemSystem;
                score = (+score) + (+specSys.score) + (actor.system.attributes[actor.system.attribute.value]!.score)
                found = true;
            }
        }
        if (!found) {
            const skill = actor.items.find((i: Item) => i.type === "skill" && i.name === actor.system.skill.value);
            if (typeof (skill) !== 'undefined') {
                const skillSys = skill.system as OD6SSkillItemSystem;
                score = (+score) + (+skillSys.score) + (actor.system.attributes[actor.system.attribute.value]!.score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[actor.system.attribute.value]!.score);
        }
        return score;
    })

    Handlebars.registerHelper('getPilotSensorsTotal', function (actor: VehicleHelperActor, sensor: string) {
        let found = false;
        const sensorsTypes = (actor.system.sensors as { types: Record<string, { score: number }> }).types;
        let score: number = sensorsTypes[sensor]!.score;
        if (!found) {
            const skillType = game.i18n.localize('NONEX_IST_OD6S.SENSORS');
            const skill =
                actor.items.find((i: Item) => i.type === "skill" && i.name === skillType);
            if (typeof (skill) !== 'undefined') {
                const skillSys = skill.system as OD6SSkillItemSystem;
                score = (+score) + (+skillSys.score) + (actor.system.attributes['mec'].score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[actor.system.attribute.value]!.score);
        }
        return score;
    })

    Handlebars.registerHelper('getPilotWeaponTotal', function (actor: VehicleHelperActor, weapon: VehicleWeaponWithStats) {
        let found = false;
        let score: number = weapon.system.fire_control.score;
        if (!found) {
            const spec = actor.items.find((i: Item) => i.type === "specialization" &&
                i.name === weapon.system.stats.specialization);
            if (typeof (spec) !== 'undefined') {
                const specSys = spec.system as OD6SSpecializationItemSystem;
                score = (+score) + (+specSys.score) + (actor.system.attributes[weapon.system.stats.attribute]!.score)
                found = true;
            }
        }
        if (!found) {
            const skill = actor.items.find((i: Item) => i.type === "skill" && i.name === weapon.system.stats.skill);
            if (typeof (skill) !== 'undefined') {
                const skillSys = skill.system as OD6SSkillItemSystem;
                score = (+score) + (+skillSys.score) + (actor.system.attributes[weapon.system.stats.attribute]!.score);
                found = true;
            }
        }
        if (!found) {
            score = (+score) + (actor.system.attributes[weapon.system.stats.attribute]!.score);
        }
        const dice = od6sutilities.getDiceFromScore(score);
        return dice.dice + "D+" + dice.pips;
    })

    Handlebars.registerHelper('getSensorsConfig', function () {
        return game.settings.get('nonex-ist-od6s', 'sensors');
    })

    Handlebars.registerHelper('getSensorTotal', function (actor: VehicleHelperActor, sensorScore: number) {
        return od6sutilities.getSensorTotal(actor, sensorScore);
    })

    Handlebars.registerHelper('getVehicleActions', function (actor: VehicleHelperActor) {
        // Return a list of available vehicle actions
        if (actor.type === 'character' || actor.type === 'npc') {
            if (typeof (actor.system.vehicle.name) != 'undefined') {
                const actions = {...OD6S.vehicle_actions};
                const shields = actor.system.vehicle.shields as { value: number } | undefined;
                if (shields?.value === 0) {
                    delete actions['shields'];
                }
                const sensors = actor.system.vehicle.sensors as { value: boolean } | undefined;
                if (!sensors?.value || actor.system.vehicle.type === 'starship') {
                    delete actions['sensors'];
                }
                return actions;
            }
        }
        return undefined;
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
                Object.entries(OD6S.difficulty).filter(([key]) => key !== 'NONEX_IST_OD6S.DIFFICULTY_UNKNOWN' &&
                    key !== 'NONEX_IST_OD6S.DIFFICULTY_CUSTOM'));
        }
    })

    Handlebars.registerHelper('sumManeuverability', function (
        actor: VehicleHelperActor,
        m: {
            specialization: { value: string };
            skill: { value: string };
            attribute: { value: string };
            maneuverability: { score: number };
        },
        type: 'score' | 'skillScore' | 'skill',
    ) {
        if (typeof (m) === 'undefined' || Object.keys(m).length === 0) return;
        const data: { score: number; skillScore: number; skill: string } = {
            score: 0, skillScore: 0, skill: '',
        };
        const skillTypes = ["specialization", "skill", 'attribute']

        // Look for a spec, then a skill, then finally attribute
        for (const s of skillTypes) {
            if (s === 'specialization' && typeof (m.specialization.value) !== "undefined" && m.specialization.value !== '') {
                const spec = actor.items.find(
                    (i: Item) => i.name === m.specialization.value && i.type === 'specialization');
                if (spec) {
                    const specSys = spec.system as OD6SSpecializationItemSystem;
                    data.score = m.maneuverability.score + specSys.score + actor.system.attributes[specSys.attribute]!.score;
                    data.skillScore = specSys.score + actor.system.attributes[specSys.attribute]!.score;
                    data.skill = spec.name;
                    break;
                }
            }
            if (s === 'skill' && typeof (m.skill.value) !== "undefined" && m.skill.value !== '') {
                const skill = actor.items.find(
                    (i: Item) => i.name === m.skill.value && i.type === 'skill');
                if (skill) {
                    const skillSys = skill.system as OD6SSkillItemSystem;
                    data.score = m.maneuverability.score + skillSys.score + actor.system.attributes[skillSys.attribute]!.score;
                    data.skillScore = skillSys.score + actor.system.attributes[skillSys.attribute]!.score;
                    data.skill = skill.name;
                    break;
                }
            }
            if (s === 'attribute') {
                data.score = actor.system.attributes[m.attribute.value]!.score + m.maneuverability.score;
                data.skillScore = actor.system.attributes[m.attribute.value]!.score;
                data.skill = game.i18n.localize(actor.system.attributes[m.attribute.value]!.label);
            }
        }
        return data[type];
    })

    Handlebars.registerHelper('isCrewMember', function (actor: VehicleHelperActor) {
        return actor.isCrewMember();
    })

    Handlebars.registerHelper('getInterstellarDriveName', function () {
        return OD6S.interstellarDriveName;
    })

    Handlebars.registerHelper('getToughnessName', function (type: string) {
        if (type === 'vehicle') return game.i18n.localize(OD6S.vehicleToughnessName);
        if (type === 'starship') return game.i18n.localize(OD6S.starshipToughnessName);
        return '';
    })
}
