import {od6sutilities} from "../../system/utilities";
import {od6sroll} from "../../apps/roll";
import OD6S from "../../config/config-od6s";

export async function resolveRollAction(actor: any, actionId: any, msg?: any): Promise<any> {
    const vehicle = (actor.type === 'starship' || actor.type === 'starship') ? actor.system : actor.system?.vehicle
    let itemId = '';
    let name = '';
    let score = 0;
    let type = '';

    let scaleMod = 0;

    let scale = 0;
    if (game.settings.get('od6s','dice_for_scale') && typeof(msg) !== 'undefined' &&
        (actionId === 'vehicletoughness' || actionId === 'er' || actionId === 'pr') ) {
        const attackMessage = game.messages.get(msg.getFlag('od6s','attackMessage'));
        const attackerScale = attackMessage!.getFlag('od6s','attackerScale');
        if(actor.type === 'vehicle' || actor.type === 'starship') {
            scale = actor.system.scale.score;
        } else {
            if(actor.system?.vehicle?.uuid !== 'undefined' && actor.system?.vehicle?.uuid !== '') {
                if(attackMessage!.getFlag('od6s','type') === 'vehicleweapon' ||
                   attackMessage!.getFlag('od6s','type') === 'starshipweapon') {
                    const vehicleActor = await od6sutilities.getActorFromUuid(actor.system.vehicle.uuid);
                    scale = vehicleActor!.system.scale.score;
                }
            }
        }

        if (attackerScale > scale) {
            // Attacker is larger
        } else if (attackerScale < scale) {
            // Attacker is smaller
            scaleMod = scale - attackerScale;
        } else if (attackerScale === scale) {
            // same size
            scaleMod = 0;
        }
    }

    switch (actionId) {
        case "rangedattack":
        case "meleeattack":
        case "brawlattack":
        case "dodge":
        case "parry":
        case "block":
            type = actionId;
            for (const k in OD6S.actions) {
                if (OD6S.actions[k].rollable && OD6S.actions[k].type === type) {
                    name = game.i18n.localize(OD6S.actions[k].name);
                    if (OD6S.actions[k].skill) {
                        const skill = actor.items.find((i: any) => i.name === name);
                        if (skill !== null && typeof (skill) !== 'undefined') {
                            score = (+skill.system.score) +
                                (+actor.system.attributes[skill.system.attribute.toLowerCase()].score);
                        } else {
                            score = actor.system.attributes[OD6S.actions[k].base].score;
                        }
                    } else {
                        score = actor.system.attributes[OD6S.actions[k].base].score;
                    }
                }
            }
            break;
        case 'vehiclerangedattack':
            // We know nothing about skills or fire control, just use the defaults
            type = actionId;
            name = game.i18n.localize('OD6S.ACTION_VEHICLE_RANGED_ATTACK');
            score = od6sutilities.getScoreFromSkill(actor, '', game.i18n.localize('OD6S.GUNNERY_SKILL'), 'mec');
            break;
        case 'vehicleramattack':
        case 'vehicledodge':
        case 'vehiclemaneuver':
            type = actionId;
            for (const k in OD6S.vehicle_actions) {
                if (OD6S.vehicle_actions[k].rollable && OD6S.vehicle_actions[k].type === type) {
                    type = actionId;
                    name = game.i18n.localize(OD6S.vehicle_actions[k].name);
                    score = od6sutilities.getScoreFromSkill(
                        actor,
                        vehicle.specialization.value,
                        vehicle.skill.value,
                        OD6S.vehicle_actions[k].base) + vehicle.maneuverability.score;
                }
            }
            break;
        case 'vehicletoughness':
            type = "vehicletoughness";
            if (actor.type === 'vehicle' || actor.type === 'starship') {
                score = actor.system.toughness.score;
                if (actor.type === 'vehicle') {
                    name = game.i18n.localize(OD6S.vehicleToughnessName);
                } else {
                    name = game.i18n.localize(OD6S.starshipToughnessName);
                }
            } else {
                score = actor.system.vehicle.toughness.score;
                if (vehicle.type === 'vehicle') {
                    name = game.i18n.localize(OD6S.vehicleToughnessName);
                } else {
                    name = game.i18n.localize(OD6S.starshipToughnessName);
                }
            }
            break;
        case 'vehicleshieldsfront':
            type = "vehicletoughness";
            score = vehicle.shields.arcs.front.value + vehicle.toughness.score;
            name = game.i18n.localize(vehicle.shields.arcs.front.label) + " " +
                game.i18n.localize('OD6S.SHIELDS');
            break;
        case 'vehicleshieldsrear':
            type = "vehicletoughness";
            score = vehicle.shields.arcs.rear.value + vehicle.toughness.score;
            name = game.i18n.localize(vehicle.shields.arcs.rear.label) + " " +
                game.i18n.localize('OD6S.SHIELDS');
            break;
        case 'vehicleshieldsleft':
            type = "vehicletoughness";
            score = vehicle.shields.arcs.left.value + vehicle.toughness.score;
            name = game.i18n.localize(vehicle.shields.arcs.left.label) + " " +
                game.i18n.localize('OD6S.SHIELDS');
            break;
        case 'vehicleshieldsright':
            type = "vehicletoughness";
            score = vehicle.shields.arcs.right.value + vehicle.toughness.score;
            name = game.i18n.localize(vehicle.shields.arcs.right.label) + " " +
                game.i18n.localize('OD6S.SHIELDS');
            break;
        case 'vehiclesensorspassive':
        case 'vehiclesensorsfocus':
        case 'vehiclesensorsscan':
        case 'vehiclesensorssearch': {
            const sensorType = actionId.replace('vehiclesensors', '');
            score = od6sutilities.getSensorTotal(actor, vehicle.sensors.types[sensorType].score);
            name = game.i18n.localize('OD6S.SENSORS') + ": " +
                game.i18n.localize(vehicle.sensors.types[sensorType].label);
            break;
        }
        case "er":
            name = game.i18n.localize(actor.system.er.label);
            score = actor.system.er.score;
            break;

        case "pr":
            name = game.i18n.localize(actor.system.pr.label);
            score = actor.system.pr.score;
            break;

        case "noArmor":
            name = game.i18n.localize(actor.system.noArmor.label);
            score = actor.system.noArmor.score;
            break;

        default: {
            let item = actor.items.find((i: any) => i.id === actionId);
            if (item !== null && typeof (item) !== 'undefined') {
                return await item.roll()
            } else {
                type = 'vehiclerangedweaponattack';
                item = actor.system.vehicle.vehicle_weapons.find((i: any) => i.id === actionId);
                if (item !== null && typeof (item) !== 'undefined') {
                    name = item.name;
                    itemId = item._id;
                    // Add spec/skill/attribute/fire control
                    score = od6sutilities.getScoreFromSkill(
                        actor,
                        item.system.specialization.value,
                        game.i18n.localize(item.system.skill.value),
                        item.system.attribute.value) + (+item.system.fire_control.score);
                }
            }
        }
    }

    const data = {
        "actor": actor,
        "itemId": itemId,
        "name": name,
        "score": score,
        "type": "action",
        "subtype": type,
        "scale": scaleMod
    }

    return await od6sroll._onRollDialog(data);
}
