import {od6sroll} from "../../apps/roll";
import OD6S from "../../config/config-od6s";
import {
    findWoundLevelByCore,
    computeNewDamageLevel,
    computeNewWoundLevel,
} from "./wounds-math";
import {isCharacterActor, isVehicleActor} from "../../system/type-guards";
import {debug} from "../../system/logger";

export {findWoundLevelByCore, computeNewDamageLevel, computeNewWoundLevel};

export async function applyDamage(actor: Actor, damage: string): Promise<void> {
    if (!isVehicleActor(actor)) return;
    const update: any = {};
    update.id = actor.id;
    update._id = actor.id;
    update.system = {};
    update.system.damage = {};
    update.system.damage.value = calculateNewDamageLevel(actor, damage);
    await actor.update(update);
}

export function calculateNewDamageLevel(actor: Actor, damage: string): string | undefined {
    if (!isVehicleActor(actor)) return undefined;
    const current = actor.system.damage.value;
    const next = computeNewDamageLevel(current, damage);
    debug('wounds', 'damage transition', {actor: actor.name, current, incoming: damage, next});
    return next;
}

export async function applyWounds(actor: Actor, wound: string): Promise<void> {
    if (!isCharacterActor(actor)) return;
    const update: any = {};
    const newValue = calculateNewWoundLevel(actor, wound);
    update.id = actor.id;
    update._id = actor.id;
    const armorUpdates: any[] = [];
    if (wound === 'OD6S.WOUNDS_STUNNED' && isCharacterActor(actor)) {
        update[`system.stuns.current`] = 1;
        update[`system.stuns.rounds`] = 1;
        update[`system.stuns.value`] = actor.system.stuns.value + 1;
    }

    if (game.settings.get('od6s', 'weapon_armor_damage') && game.settings.get('od6s', 'auto_armor_damage')) {
        if (actor.itemTypes.armor.length) {
            actor.itemTypes.armor.forEach((value: any, _index: any, _array: any) => {
                let armorDamage = 0;
                const damaged = typeof value.system.damaged === "undefined" ? 0 : value.system.damaged;

                if (value.system.equipped.value) {
                    switch (wound) {
                        case 'OD6S.WOUNDS_WOUNDED':
                            if (damaged <= 1) armorDamage = 1;
                            break;
                        case 'OD6S.WOUNDS_SEVERELY_WOUNDED':
                            if (damaged <= 1) armorDamage = 1;
                            break;
                        case 'OD6S.WOUNDS_INCAPACITATED':
                            if (damaged <= 2) armorDamage = 2;
                            break;
                        case 'OD6S.WOUNDS_MORTALLY_WOUNDED':
                            if (damaged <= 3) armorDamage = 3;
                            break;
                        case 'OD6S.WOUNDS_DEAD':
                            if (damaged <= 4) armorDamage = 4;
                            break;
                        default:
                            break;
                    }
                    if(armorDamage > 0) {
                       const armorUpdate: any = {};
                       armorUpdate._id = value._id;
                       armorUpdate.system = {};
                       armorUpdate.system.damaged = armorDamage;
                       armorUpdates.push(armorUpdate);
                    }
                }
            })
        }
    }
    if(armorUpdates.length > 0) {
        await actor.updateEmbeddedDocuments('Item', armorUpdates);
    }

    update[`system.wounds.value`] = newValue;
    await actor.update(update);
}

export function calculateNewWoundLevel(actor: Actor, wound: string): unknown {
    const deadlinessTable = OD6S.deadliness[OD6S.deadlinessLevel[actor.type]];
    if (!isCharacterActor(actor)) return undefined;
    const current = actor.system.wounds.value;
    const next = computeNewWoundLevel(current, wound, deadlinessTable, OD6S.stunDamageIncrement);
    debug('wounds', 'wound transition', {
        actor: actor.name,
        current,
        currentCore: deadlinessTable[current]?.core,
        incoming: wound,
        next,
        nextCore: deadlinessTable[next as string]?.core,
        stunDamageIncrement: OD6S.stunDamageIncrement,
    });
    return next;
}

export async function triggerMortallyWoundedCheck(actor: Actor): Promise<void> {
    if (actor.getFlag('od6s', 'mortally_wounded') !== 'undefined') {
        const rollData = {
            name: game.i18n.localize('OD6S.RESIST_MORTALLY_WOUNDED'),
            actor: actor,
            score: actor.system.attributes.str.score,
            type: 'mortally_wounded',
            difficulty: actor.getFlag('od6s','mortally_wounded'),
            difficultyLevel: 'OD6S.DIFFICULTY_CUSTOM'
        }
        await od6sroll._onRollDialog(rollData);
    }
}

export async function applyMortallyWoundedFailure(actor: Actor): Promise<void> {
    if(game.settings.get('od6s','auto_status')) {
        await actor.toggleStatusEffect('dead', {overlay: false, active: true});
    }

    const object = OD6S.deadliness[OD6S.deadlinessLevel[actor.type]]
    const dead = Object.keys(object).find(
        key=> object[key].core === 'OD6S.WOUNDS_DEAD');
    const update = {
        system: {
            wounds: {
                value: dead
            }
        }
    }

    await actor.update(update)
    await actor.unsetFlag('od6s','mortally_wounded');
}

export async function applyIncapacitatedFailure(actor: Actor): Promise<void> {
    const roll = await new Roll("10d6").evaluate();
    const flavor = actor.name + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_01') +
        roll.total + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_02');
    if (game.modules.get("dice-so-nice")?.active) game.dice3d.messageHookDisabled=true;
    await roll.toMessage({flavor: flavor});
    if (game.modules.get("dice-so-nice")?.active) game.dice3d.messageHookDisabled=false;

    await actor.toggleStatusEffect('unconscious', {overlay: false, active: true});
}

export function findFirstWoundLevel(_actor: Actor, table: Record<string, { core: string; description?: string; penalty?: number }>, wound: string): string | undefined {
    return findWoundLevelByCore(table, wound);
}

export function getWoundLevelFromBodyPoints(actor: Actor, bp?: number): string | undefined {
    if (!isCharacterActor(actor)) return;
    let bodyPointsCurrent;
    const sys = actor.system;
    if (typeof (bp) !== 'undefined') {
        bodyPointsCurrent = bp;
    } else {
        bodyPointsCurrent = sys.wounds.body_points.current
    }

    if (bodyPointsCurrent < 1) return 'OD6S.WOUNDS_DEAD';
    const ratio = Math.ceil(bodyPointsCurrent / sys.wounds.body_points.max * 100)
    let level;
    for (const key in OD6S.bodyPointLevels) {
        if (ratio < OD6S.bodyPointLevels[key]) {
            level = key;
        } else {
            break;
        }
    }
    if (typeof (level) === 'undefined') level = 'OD6S.WOUNDS_HEALTHY';
    return level;
}

export async function setWoundLevelFromBodyPoints(actor: Actor, bp: number): Promise<void> {
    const update: any = {};
    update[`system.wounds.body_points.current`] = bp;
    update._id = actor.id;
    update.id = actor.id;
    await actor.update(update);
    update[`system.wounds.value`] =
        Object.keys(Object.fromEntries(Object.entries(OD6S.deadliness[3]).filter(
            ([_k, v]) => (v as { description?: string }).description === actor.getWoundLevelFromBodyPoints(),
        )))[0];
    await actor.update(update);
}
