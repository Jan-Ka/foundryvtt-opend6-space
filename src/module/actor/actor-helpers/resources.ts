export async function useCharacterPointOnRoll(actor: any, message: any): Promise<void> {
    // Roll 1d6x6 and deduct a character point from the actor
    //const actor = game.actors.get(message.speaker.actor);
    // Bail if out of character points
    if (actor.system.characterpoints.value < 1) {
        ui.notifications.warn(game.i18n.localize("OD6S.NOT_ENOUGH_CP_ROLL"));
        return;
    }
    const rollString = "1d6x6[CP]";
    const roll = await new Roll(rollString).evaluate();
    if (game.modules.get('dice-so-nice')?.active) {
        game.dice3d.showForRoll(roll, game.user, true, false, false);
    }

    const update: any = {};
    update.id = actor.id;
    update.system = {};
    update.system.characterpoints = {};
    update.system.characterpoints.value = actor.system.characterpoints.value -= 1;

    switch (message.getFlag('od6s', 'subtype')) {
        case "dodge":
            update.dodge = {};
            update.dodge.score = actor.system.dodge.score + roll.total;
            break;
        case "parry":
            update.parry = {};
            update.parry.score = actor.system.parry.score + roll.total;
            break;
        case "block":
            update.block = {};
            update.block.score = actor.system.block.score + roll.total;
            break;
        default:
            break;
    }

    await actor.update(update);

    // Update original message and re-display
    const replacementRoll = JSON.parse(JSON.stringify(message.rolls[0]));
    replacementRoll.dice.push(roll.dice[0]);
    replacementRoll.total += roll.total;

    const messageUpdate: any = {};
    messageUpdate.system = {};
    messageUpdate.content = replacementRoll.total;
    messageUpdate.id = message.id;
    messageUpdate._id = message._id;
    messageUpdate.rolls = [replacementRoll];

    if (game.user.isGM) {
        await message.update(messageUpdate, {"diff": true});
        await message.setFlag('od6s', 'total', replacementRoll.total);
        if ((+messageUpdate.content) >= (message.getFlag('od6s', 'difficulty'))) {
            await message.setFlag('od6s', 'success', true);
        }
    } else {
        game.socket.emit('system.od6s', {
            operation: 'updateRollMessage',
            message: message,
            update: messageUpdate
        })
    }

    // Is this an init roll?
    if (message.getFlag('core', 'initiativeRoll')) {
        if (game.user.isGM) {
            if (game.combat !== null) {
                const combatant = game.combat.combatants.find(c => c.actor.id === actor.id);
                const update = {
                    id: combatant!.id,
                    _id: combatant!.id,
                    initiative: replacementRoll.total
                }
                await combatant!.update(update);
            }
        } else {
            game.socket.emit('system.od6s', {
                operation: "updateInitRoll",
                message: message,
                update: messageUpdate
            })
        }
    }
}
