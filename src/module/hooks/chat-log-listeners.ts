import {od6sutilities} from "../system/utilities";
import OD6S from "../config/config-od6s";
import { isOpposedQueueEmpty, pushOpposedQueue } from "../system/utilities/opposed";
import OD6SEditDifficulty from "../apps/edit-difficulty";
import {OD6SEditDamage} from "../apps/edit-damage";
import {OD6SChooseTarget} from "../apps/choose-target";
import {OD6SHandleWildDieForm} from "../apps/handle-wild-die";

// Delegated event helper: attaches a listener on a parent that fires when a child matching selector is the target
function delegateEvent(
    parent: HTMLElement,
    eventType: string,
    selector: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (ev: any) => void,
) {
    parent.addEventListener(eventType, (ev: Event) => {
        const target = (ev.target as Element | null)?.closest(selector);
        if (target && parent.contains(target)) {
            // Make ev.currentTarget behave like jQuery delegation
            Object.defineProperty(ev, 'currentTarget', { value: target, configurable: true });
            handler(ev);
        }
    });
}

export function registerChatLogListeners() {
    Hooks.on('renderChatLog', (log, html, data) => {
        // In v14, html is an HTMLElement, not jQuery

        delegateEvent(html, 'input', ".explosive-damage", async (ev: any) => {
            const message =  await game.messages.get(ev.currentTarget.dataset.messageId);
            const targets = message!.getFlag('od6s','targets');
            targets[ev.currentTarget.dataset.target].damage = ev.target.value;
            await message!.setFlag('od6s','targets',targets);
        })

        delegateEvent(html, "click", ".modifiers-button", async (ev: any) => {
            const content = document.getElementById("modifiers-display-" + ev.currentTarget.dataset.messageId);
            if (content!.style.display === "block") {
                content!.style.display = "none";
            } else {
                content!.style.display = "block";
            }
            game!.messages.get(ev.currentTarget.dataset.messageId)?.render();
        })

        delegateEvent(html, "click", ".damage-modifiers-button", async (ev: any) => {
            const content = document.getElementById("damage-modifiers-display-" + ev.currentTarget.dataset.messageId);
            if (content!.style.display === "block") {
                content!.style.display = "none";
            } else {
                content!.style.display = "block";
            }
            game!.messages.get(ev.currentTarget.dataset.messageId)?.render();
        })

        delegateEvent(html, "click", ".apply-damage-button", async (ev: any) => {
            ev.preventDefault();
            const token = game.scenes.active.tokens.get(ev.currentTarget.dataset.tokenId);
            let actor = token?.actor;
            if (!actor) return;
            const result = ev.currentTarget.dataset.result;
            const isVehicle = ev.currentTarget.dataset.isVehicle;
            const messageId = ev.currentTarget.dataset.messageId;
            const update = {};
            const stun = ev.currentTarget.dataset.stun;
            const msg = game.messages.get(messageId);
            const stunEffect = msg!.getFlag('od6s', 'stunEffect');

            if ((actor.type !== 'vehicle' && actor.type !== 'starship') && (isVehicle === true || isVehicle === 'true')) {
                actor = await od6sutilities.getActorFromUuid((actor.system as OD6SCharacterSystem).vehicle.uuid);
            }

            if (od6sutilities.boolCheck(stun)) {
                if (stunEffect === 'unconscious') {
                    if (game.settings.get('od6s', 'auto_status')) {
                        await actor!.toggleStatusEffect('unconscious', {overlay: false, active: true});
                    }
                } else {
                    if (stunEffect === '-1D') {
                        const update: any = {}
                        update[`system.stuns.current`] = 1;
                        update[`system.stuns.rounds`] = 1;
                        update[`system.stuns.value`] = (+(actor!.system as OD6SCharacterSystem).stuns.value) + 1;
                        await actor!.update(update);
                    } else if (stunEffect === '-2D') {
                        (update as any)[`system.stuns.current`] = 2;
                        (update as any)[`system.stuns.rounds`] = 1;
                        (update as any)[`system.stuns.value`] = (+(actor!.system as OD6SCharacterSystem).stuns.value) + 1;
                        await actor!.update(update);
                    }
                    if(!actor!.effects.contents.find(
                        (i: any) => i.name === game.i18n.localize(CONFIG!.statusEffects.find(
                            e => e.id === 'stunned')!.name))) {
                        await actor!.toggleStatusEffect('stunned', {overlay: false, active: true});
                    }
                }

            } else {
                (update as any).id = actor!.id;
                if (game.settings.get('od6s', 'bodypoints') === 0 || (isVehicle === true || isVehicle === 'true')
                    || actor!.type === 'starship' || actor!.type === 'vehicle') {
                    if (isVehicle === true || isVehicle === 'true') {
                        await actor!.applyDamage(result);
                    } else {
                        await actor!.applyWounds(result);
                    }
                } else {
                    let bp = (actor!.system as OD6SCharacterSystem).wounds.body_points.current - result;
                    if (bp < 0) bp = 0;
                    (update as any)['system.wounds.body_points.current'] = bp;
                    if (game.settings.get('od6s', 'bodypoints') === 1) await actor!.setWoundLevelFromBodyPoints(bp);
                }
                await actor!.update(update);
            }
            await actor!.update(update);
            await msg!.setFlag('od6s', 'applied', true);
        })

        delegateEvent(html, "click", ".explosive-damage-button", async (ev: any) => {
            ev.preventDefault();
            await od6sutilities.detonateExplosive(ev.currentTarget.dataset);
        })

        delegateEvent(html, 'click', '.remove-template-button', async (ev: any) => {
            const message =  await game.messages.get(ev.currentTarget.dataset.messageId);
            const actor = message!.speaker.token === null
                ? game.actors.get(message!.speaker.actor)
                : game!.scenes.active.tokens.get(message!.speaker.token)?.actor;
            const item = actor!.items.get(message!.getFlag('od6s','itemId'));
            const regionId = item!.getFlag('od6s','explosiveTemplate');
            const region = regionId ? canvas.scene.getEmbeddedDocument('Region', regionId) : null;
            if (region) await region.setFlag('od6s','handled', true);
            await message!.setFlag('od6s','handled', true);
            if (region) await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]);
            // @ts-expect-error
            msg.setFlag('od6s', 'applied', true);
        })

        delegateEvent(html, "click", ".damage-button", async (ev: any) => {
            ev.preventDefault();
            const data = ev.currentTarget.dataset;
            const dice: any = {};
            dice.dice = data.damageDice;
            dice.pips = data.damagePips;
            let rollString;
            let itemId = '';

            if (typeof (data?.itemId) !== 'undefined' && data.itemId !== '') {
                itemId = data.itemId;
            }

            if (game.settings.get('od6s', 'use_wild_die')) {
                dice.dice = dice.dice - 1;
                if (dice.dice < 1) {
                    rollString = "+1dw" + game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
                } else {
                    rollString = dice.dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR') + "+1dw" +
                        game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
                }
            } else {
                rollString = dice.dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR');
            }
            dice.pips ? rollString += "+" + dice.pips : null;
            if (!game.settings.get('od6s', 'dice_for_scale')) {
                if (data.damagescalebonus > 0) rollString += "+" + Math.abs(data.damagescalebonus);
                if (data.damagescalebonus < 0) rollString += "-" + Math.abs(data.damagescalebonus);
            }

            const roll = await new Roll(rollString).evaluate();

            let label = game.i18n.localize('OD6S.DAMAGE') + " (" +
                game.i18n.localize(OD6S.damageTypes[data.damagetype]) + ")";

            if (typeof (data.source) !== 'undefined' && data.source !== '') {
                label = label + " " + game.i18n.localize('OD6S.FROM') + " " +
                    game.i18n.localize(data.source);
            }

            if (typeof (data.vehicle) !== 'undefined' && data.vehicle !== '') {
                const vehicle = await od6sutilities.getActorFromUuid(data.vehicle);
                label = label + " " + game.i18n.localize('OD6S.BY') + " " + vehicle!.name;
            }

            if (typeof (data.targetname) !== 'undefined' && data.targetname !== '') {
                label = label + " " + game.i18n.localize('OD6S.TO') + " " + data.targetname;
            }

            data.collision = (data.collision === 'true');

            const flags = {
                "type": "damage",
                "source": data.source,
                "damageType": data.damagetype,
                "targetName": data.targetname,
                "targetId": data.targetid,
                "attackMessage": data.messageId,
                "isOpposable": true,
                "wild": false,
                "wildHandled": false,
                "wildResult": OD6S.wildDieResult[OD6S.wildDieOneDefault],
                "total": roll.total,
                "isVehicleCollision": data.collision,
                "stun": data.stun,
                "itemId": itemId
            }

            if (game.settings.get('od6s', 'use_wild_die')) {
                const WildDie = roll.terms.find(d => game.i18n.localize("OD6S.WILD_DIE_FLAVOR").includes(d.flavor))
                if (WildDie!.total === 1) {
                    flags.wild = true;
                    if (OD6S.wildDieOneDefault > 0 && OD6S.wildDieOneAuto === 0) {
                        flags.wildHandled = true;
                    }
                } else {
                    flags.wild = false;
                }
            }

            let rollMode = CONST.DICE_ROLL_MODES.PUBLIC;
            if (game.user.isGM && game.settings.get('od6s', 'hide-gm-rolls')) rollMode = CONST.DICE_ROLL_MODES.PRIVATE;

            const rollMessage = await roll.toMessage({
                speaker: ChatMessage.getSpeaker({actor: game.actors.find(a => a.id === data.actor)}),
                flavor: label,
                flags: {
                    od6s: flags
                },
            }, {rollMode, create: true});

            if (flags.wild === true && OD6S.wildDieOneDefault === 2 && OD6S.wildDieOneAuto === 0) {
                const replacementRoll = JSON.parse(JSON.stringify(rollMessage.rolls[0].toJSON()));
                let highest = 0;
                for (let i = 0; i < replacementRoll.terms[0].results.length; i++) {
                    replacementRoll.terms[0].results[i].result >
                    replacementRoll.terms[0].results[highest].result ?
                        highest = i : {}
                }
                replacementRoll.terms[0].results[highest].discarded = true;
                replacementRoll.terms[0].results[highest].active = false;
                replacementRoll.total -= (+replacementRoll.terms[0].results[highest].result);
                const rollMessageUpdate: any = {};
                rollMessageUpdate.system = {};
                rollMessageUpdate.content = replacementRoll.total;
                rollMessageUpdate.id = rollMessage.id;
                rollMessageUpdate.rolls = [];
                rollMessageUpdate.rolls[0] = replacementRoll;

                if (game.user.isGM) {
                    if (rollMessage.getFlag('od6s', 'difficulty') && rollMessage.getFlag('od6s', 'success')) {
                        replacementRoll.total < rollMessage.getFlag('od6s', 'difficulty') ? await rollMessage.setFlag('od6s', 'success', false) :
                            await rollMessage.setFlag('od6s', 'success', true);
                    }
                    await rollMessage.setFlag('od6s', 'originalroll', rollMessage.rolls[0])
                    await rollMessage.update(rollMessageUpdate, {"diff": true});
                } else {
                    game.socket.emit('system.od6s', {
                        operation: 'updateRollMessage',
                        message: rollMessage,
                        update: rollMessageUpdate
                    })
                }
            }
        })

        delegateEvent(html, "click", ".flavor-text", async (ev: any) => {
            if (!game.user.isGM) return;
            const message = game.messages.get(ev.currentTarget.dataset.messageId);
            let actor;
            if (message!.speaker.actor && message?.speaker.token) {
                actor = game.actors.tokens[message.speaker.token];
                if (typeof actor === "undefined" || actor === '') {
                    actor = game.actors.get(message.speaker.actor);
                }
            } else {
                actor = game.actors.get(message!.speaker.actor)
            }
            // Find the item
            let item = actor?.items.find((i: any) => i.id === message!.getFlag('od6s', 'itemId'));
            if (typeof (item) === "undefined" || item === "") {
                // See if the actor is a crewmember
                if (typeof (actor?.system.vehicle.name) !== 'undefined') {
                    const vehicleActor = await od6sutilities.getActorFromUuid(actor.system.vehicle.uuid);
                    item = vehicleActor!.items.find((i: any) => i.id === message!.getFlag('od6s', 'itemId'));
                }
            }
            if (typeof (item) === "undefined") return;
            item.sheet.render(true);
        })

        delegateEvent(html, "click", ".select-actor", async (ev: any) => {
            if (!game.user.isGM) return;
            ev.preventDefault();
            const message = game.messages.get(ev.currentTarget.dataset.messageId);
            let actor;
            if (message!.speaker.actor && message!.speaker.token) {
                actor = game.actors.tokens[message!.speaker.token];
            } else {
                actor = game.actors.get(message!.speaker.actor)
            }
            actor.sheet.render(true);
        })

        delegateEvent(html, "click", ".edit-difficulty", async (ev: any) => {
            const data: any = {};
            const dataSet = ev.currentTarget.dataset;
            data.messageId = dataSet.messageId;
            const message = game.messages.get(dataSet.messageId);
            data.baseDifficulty = message!.getFlag('od6s', 'baseDifficulty');
            data.modifiers = message!.getFlag('od6s', 'modifiers');
            new OD6SEditDifficulty(data).render(true);
        })

        delegateEvent(html, "click", ".edit-difficulty-submit", async (_ev: any) => {
        })

        delegateEvent(html, "click", ".edit-damage", async (ev: any) => {
            ev.preventDefault();
            const data: any = {};
            const dataSet = ev.currentTarget.dataset;
            data.messageId = dataSet.messageId;
            const message = game.messages.get(dataSet.messageId);
            data.damage = message!.getFlag('od6s', 'damageScore');
            data.damageDice = message!.getFlag('od6s', 'damageDice');
            new OD6SEditDamage(data).render(true);
        })

        delegateEvent(html, "click", ".choose-target", async (ev: any) => {
            ev.preventDefault();
            data = {};
            data.targets = [];
            data.messageId = ev.currentTarget.dataset.messageId;
            const message = game.messages.get(data.messageId);

            if (game.user.isGM) {
                data.isExplosive = message!.getFlag('od6s','isExplosive');
                // If in combat, only load tokens in combat.  Otherwise, load all tokens in scene
                if (game.combat) {
                    for (const t of game.combat.combatants) {
                        const target = {
                            "id": (t as any).token.id,
                            "name": (t as any).token.name
                        }
                        data.targets.push(target);

                    }
                } else {
                    data.targets = game.scenes.active.tokens;
                }
            } else {
                return;
            }
            new OD6SChooseTarget(data).render({force: true});
        })

        delegateEvent(html, "change", ".explosive-target-zone", async (ev: any) => {
            const message = game.messages.get(ev.currentTarget.dataset.messageId);
            const targets = Array.from(message!.getFlag('od6s','targets')) as Array<{ id: string; zone?: number }>;
            for (const t in targets) {
                if(ev.currentTarget.dataset.targetId === targets[t].id) {
                    targets[t].zone = parseInt(ev.target.value);
                }
            }
            await message!.setFlag('od6s','targets', targets);
        })

        delegateEvent(html, "click", ".message-sender", async (ev: any) => {
            ev.preventDefault();
            const message = await game.messages.get(ev.currentTarget.dataset.messageId);
            if (message!.speaker?.token !== null && message!.speaker?.token !== "") {
                const scene = game.scenes.get(message!.speaker.scene);
                const token = scene!.tokens.get(message!.speaker.token);
                if (typeof (token) !== "undefined" && typeof (token.actor) !== "undefined" && token.actor !== null) {
                    if (game.user.isGM || token.actor.isOwner) {
                        token.actor.sheet.render(true)
                    }
                }
            }
        })

        delegateEvent(html, "click", ".wilddiegm", async (ev: any) => {
            ev.preventDefault();
            // three choices: leave it as-is, remove the highest die from the roll, or cause a complication
            new OD6SHandleWildDieForm(ev).render({force: true});
        })

        delegateEvent(html, "click", ".message-reveal", async (ev: any) => {
            const message = game.messages.get(ev.currentTarget.dataset.messageId);
            await message!.setFlag('od6s', 'isVisible', true);
            await message!.setFlag('od6s', 'isKnown', true);
            if(message!.getFlag('od6s','isExplosive') && game.settings.get('od6s','auto_explosive')) {
                // Reveal the explosive region
                const region = od6sutilities.getTemplateFromMessage(message!).template;
                if(region) {
                    await region.update({ visibility: 2 }); // Make visible to all
                }
            }
        })

        delegateEvent(html, "click", ".message-oppose", async (ev: any) => {
            ev.preventDefault();
            // Check if there are any opposed cards already in the pipe
            const data: any = {};
            data.messageId = ev.currentTarget.dataset.messageId;
            data.target = ev.currentTarget.dataset?.target;

            if (!isOpposedQueueEmpty()) {
                pushOpposedQueue(data);
                // @ts-expect-error
                return od6sutilities.handleOpposedRoll(data);
            } else {
                pushOpposedQueue(data);
            }
        })

        delegateEvent(html, "change", ".choose-difficulty", async (ev: any) => {
            ev.preventDefault();
            const message = game.messages.get(ev.currentTarget.dataset.messageId);
            const flags = {
                difficultyLevel: ev.currentTarget.value,
                difficulty: await od6sutilities.getDifficultyFromLevel(ev.currentTarget.value)
            }

            const update: any = {};
            update.flags = {};
            update.flags.od6s = flags;
            update.id = message!.id;
            update._id = message!.id;

            if (message!.getFlag('od6s', 'total') < flags.difficulty) {
                (flags as any).success = false;
            } else {
                (flags as any).success = true;
            }

            if (message!.getFlag('od6s', 'subtype') === 'purchase' && message!.getFlag('od6s', 'success')) {
                const seller = game.actors.get(message!.getFlag('od6s', 'seller'));
                await seller!.sheet._onPurchase(message!.getFlag('od6s', 'purchasedItem'), message!.speaker.actor);
            }

            await message!.update(update, {"diff": true});
        })
    })
}
