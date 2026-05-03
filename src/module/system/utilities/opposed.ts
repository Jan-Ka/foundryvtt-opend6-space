import OD6S from "../../config/config-od6s";
import { boolCheck } from "./converters";
import { getActorFromUuid, getTokenFromUuid } from "./actors";
import { getInjury } from "./wounds";
import { isVehicleActor } from "../type-guards";

/**
 * Pure stun-effect calculator extracted from handleOpposedRoll.
 *
 * When stunScaling is false the stun always renders the target unconscious
 * (the default book behaviour). When true the ratio of winner to loser total
 * determines the severity:
 *   winner ≥ 3× loser → unconscious
 *   winner ≥ 2× loser → −2D
 *   otherwise         → −1D
 */
export function computeStunEffect(
    winnerTotal: number,
    loserTotal: number,
    stunScaling: boolean,
): 'unconscious' | '-2D' | '-1D' {
    if (!stunScaling) return 'unconscious';
    if (winnerTotal >= 3 * loserTotal) return 'unconscious';
    if (winnerTotal >= 2 * loserTotal) return '-2D';
    return '-1D';
}

let opposedQueue: Array<{messageId: string}> = [];
export function isOpposedQueueEmpty() { return opposedQueue.length === 0; }
export function clearOpposedQueue() { opposedQueue = []; }
export function pushOpposedQueue(entry: {messageId: string}) { opposedQueue.push(entry); }
export function getOpposedQueueEntry(index: number) { return opposedQueue[index]; }
export function setOpposedQueueEntry(index: number, entry: {messageId: string}) { opposedQueue[index] = entry; }

export async function autoOpposeRoll(msg: ChatMessage): Promise<void> {
    if (msg.getFlag('od6s','opposedRollDone')) return;
    if (game.settings.get('od6s', 'use_wild_die')
        && msg.getFlag('od6s', 'wild') && !msg.getFlag('od6s', 'wildHandled')) return;
    const token = game.scenes!.active!.tokens.get(msg.getFlag('od6s', 'targetId'))
    if (typeof (token) !== 'undefined') {
        await msg.setFlag('od6s','opposedRollDone', true)
        await generateOpposedRoll(token, msg);
    }
    if (!isOpposedQueueEmpty()) {
        if (msg.getFlag('od6s', 'type') === 'damage'||msg.getFlag('od6s', 'type') === 'explosive') {
            // Shouldn't be here, damage needs to come before resistance.
            clearOpposedQueue();
            pushOpposedQueue({ messageId: msg.id });
        } else if (msg.getFlag('od6s', 'type') === 'resistance') {
            pushOpposedQueue({ messageId: msg.id });
            return await handleOpposedRoll();
        }
    } else {
        if (msg.getFlag('od6s', 'type') === 'damage'||msg.getFlag('od6s', 'type') === 'explosive') {
            pushOpposedQueue({ messageId: msg.id });
        } else {
            clearOpposedQueue();
        }
    }
}

export async function handleOpposedRoll(): Promise<void> {
    let type: string;
    let winner: ChatMessage;
    let loser: ChatMessage;
    let result: any;
    let damageFlavor;
    let stunned = false;
    const data: any = {};
    data.flags = {};
    let collision: any;
    let passengerDamage = '';
    const message1 = (await game.messages.get(getOpposedQueueEntry(0).messageId))!;
    const message2 = (await game.messages.get(getOpposedQueueEntry(1).messageId))!;
    const messageType1 = message1.getFlag('od6s', 'type');
    const messageType2 = message2.getFlag('od6s', 'type');
    clearOpposedQueue();

    if (((messageType1 === 'damage' || messageType1 === 'explosive') && message2!.getFlag('od6s', 'type') === 'resistance') ||
        (messageType1) === 'resistance' && (messageType2 === 'damage' || messageType2 === 'explosive')) {
        type = "damageresult";
    } else {
        type = "opposedcheck";
    }

    collision = (message1!.getFlag('od6s', 'isVehicleCollision') || message2!.getFlag('od6s', 'isVehicleCollision'))
    collision = (collision === 'true');

    if (typeof (game.actors.get(message1!.speaker.actor)) !== "undefined") {
        message1!.actorType = game!.actors!.get(message1!.speaker.actor)!.type;
    } else {
        message1!.actorType = "system";
    }

    if (typeof (game.actors.get(message2!.speaker.actor)) !== "undefined") {
        message2!.actorType = game!.actors!.get(message2!.speaker.actor)!.type;
    } else {
        message2!.actorType = "system";
    }

    message1!.flavorName = message1!.alias;
    message2!.flavorName = message2!.alias;

    if (message1!.getFlag('od6s', 'vehicle')) {
        message1!.actorType = "vehicle";
        const vehicleActor = await getActorFromUuid(message1!.getFlag('od6s', 'vehicle'));
        message1!.flavorName = vehicleActor!.name;
    }
    if (message2!.getFlag('od6s', 'vehicle')) {
        message2!.actorType = "vehicle";
        const vehicleActor = await getActorFromUuid(message2!.getFlag('od6s', 'vehicle'));
        message2!.flavorName = vehicleActor!.name;
    }

    if(messageType1 === 'explosive' || messageType2 === 'explosive') {
        if (messageType1 === 'explosive') {
            const targetId = message2!.speaker.token;
            const damage = message1!.getFlag('od6s', 'targets').find((t: any) => t.id === targetId).damage;
            const resistance = message2!.rolls[0].total;
            if (damage > resistance) {
                winner = message1;
                loser = message2;
            } else {
                winner = message2;
                loser = message1;
            }
        } else {
            const targetId = message1!.speaker.token !== null ? message1!.speaker.token : message1!.speaker.actor;
            const damage = message2!.getFlag('od6s', 'targets').find((t: any) =>t.id === targetId).damage;
            const resistance = message1!.rolls[0].total;
            if (damage > resistance) {
                winner = message2;
                loser = message1;
            } else {
                winner = message1;
                loser = message2;
            }
        }
    } else {
        if (message1!.rolls[0].total > message2!.rolls[0].total) {
            winner = message1;
            loser = message2;
        } else {
            winner = message2;
            loser = message1;
        }
    }

    const stun = await message1!.getFlag('od6s', 'stun') || await message2!.getFlag('od6s', 'stun');
    let stunEffect = 'unconscious';

    const diff = (+winner.rolls[0].total) - (+loser.rolls[0].total);

    if (type === "damageresult") {

        if (loser.actorType === "vehicle" || loser.actorType === "starship") {
            damageFlavor = game.i18n.localize('OD6S.DAMAGES');
        } else {
            if (boolCheck(data.stun)) {
                damageFlavor = game.i18n.localize('OD6S.STUNS');
            } else {
                damageFlavor = game.i18n.localize("OD6S.INJURES");
            }
        }

        if (winner.getFlag('od6s', 'type') === "damage" || winner.getFlag('od6s', 'type') === 'explosive') {
            if (boolCheck(stun)) {
                data.content = winner.alias + " " + damageFlavor + " " + loser.flavorName;
                stunned = true;
                if (OD6S.stunScaling) {
                    if (winner.rolls[0].total >= (3 * loser.rolls[0].total)) {
                        stunEffect = 'unconscious';
                    } else if (winner.rolls[0].total >= (2 * loser.rolls[0].total)) {
                        stunEffect = '-2D';
                    } else {
                        stunEffect = '-1D';
                    }
                }

                if (stunEffect === 'unconscious') {
                    if (OD6S.stunDice) {
                        const roll = await new Roll("2d6").evaluate();
                        result = loser.flavorName + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_01') +
                            roll.total + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_02');
                    } else {
                        result = loser.flavorName + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_01') +
                            diff + game.i18n.localize('OD6S.CHAT_UNCONSCIOUS_02');
                    }
                } else {
                    if (stunEffect === '-2D') {
                        result = game.i18n.localize('OD6S.WOUNDS_STUNNED') + " " + stunEffect;
                    } else if (stunEffect === '-1D') {
                        result = game.i18n.localize('OD6S.WOUNDS_STUNNED') + " " + stunEffect;
                    }
                }
            } else {
                data.content = winner.alias + " " + damageFlavor + " " + loser.flavorName;
                if (OD6S.woundConfig > 0 && loser.actorType !== 'vehicle' && loser.actorType !== 'starship') {
                    result = diff;
                } else {
                    result = getInjury(diff, loser.actorType!);
                }
            }
        } else {
            data.content = winner.alias + " " + game.i18n.localize("OD6S.RESISTS") + " " + loser.alias;
            if (winner.actorType === "vehicle" || winner.actorType === "starship") {
                result = 'OD6S.NO_DAMAGE';
            } else {
                if (OD6S.woundConfig > 0 && loser.actorType !== 'vehicle' && loser.actorType !== 'starship') {
                    result = 0;
                } else {
                    result = 'OD6S.NO_INJURY';
                }
            }
        }
    } else {
        data.flavor = message1!.alias + " " + game.i18n.localize("OD6S.VS") + " " + message2!.alias;
        data.content = winner.alias + " " + game.i18n.localize("OD6S.WINS");
    }

    let loserId: string | Actor | undefined = loser.speaker.token;
    if (loser.actorType === "vehicle" || loser.actorType === "starship") {
        const token = await getTokenFromUuid(loser.getFlag('od6s','vehicle'));
        if (typeof (token) !== 'undefined') {
            loserId = token.id;
        } else {
            loserId = await getActorFromUuid(loser.getFlag('od6s', 'vehicle'));
        }
        if (OD6S.passengerDamageDice) {
            passengerDamage = OD6S.vehicle_damage[result].passenger_damage_dice + "D";
        } else {
            passengerDamage = game.i18n.localize(OD6S.vehicle_damage[result].passenger_damage);
        }
    }

    let apply = false;
    if (OD6S.woundConfig > 0 && loser.actorType !== 'vehicle' && loser.actorType !== 'starship') {
        if (result > 0 || stunned) apply = true;
    } else if (result !== 'OD6S.NO_INJURY' && result !== 'OD6S.NO_DAMAGE') {
        apply = true;
    }

    data.flags.od6s = {
        "isOpposed": true,
        "type": type,
        "isVisible": false,
        "result": result,
        "apply": apply,
        "applied": false,
        "stun": boolCheck(stun),
        "stunEffect": stunEffect,
        "loserIsVehicle": loser.actorType === 'vehicle' || loser.actorType === 'starship',
        "loserId": loserId,
        "isCollision": collision,
        "passengerDamage": passengerDamage
    }
    await ChatMessage.create(data);
}

export async function generateOpposedRoll(token: TokenDocument, msg: ChatMessage): Promise<void> {
    if (!token.actor.hasPlayerOwner) {
        if (msg.getFlag('od6s', 'type') === 'damage' || msg.getFlag('od6s','type') === 'explosive') {
            const type = msg.getFlag('od6s', 'damageType');
            if (isVehicleActor(token.actor)) {
                const sys = token.actor.system;
                if (sys.embedded_pilot.value || sys.crewmembers.length < 1) {
                    await token.actor.rollAction('vehicletoughness', msg);
                    return;
                } else {
                    const actor = await getActorFromUuid(sys.crewmembers[0].uuid);
                    await actor!.rollAction('vehicletoughness', msg);
                    return;
                }
            }
            if (type === 'e') {
                await token.actor.rollAction('er', msg);
            } else if (type === 'p') {
                await token.actor.rollAction('pr', msg);
            }
        }
    } else {
        // noop
    }
}
