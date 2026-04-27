export class OD6SChat {

    static chatContextMenu(html: any, options: any[]) {
        const canApplyCharacterPoint = function (li: any) {
            const result = false;
            let actor;
            if (li.find(".dice-roll").length) {
                const message = game.messages.get(li.attr("data-message-id"));
                if (message!.speaker.actor) {
                    if (message!.speaker.token) {
                        actor = game.scenes.viewed.tokens.filter(t => t.id === message!.speaker.token)[0].actor;
                    } else {
                        actor = game.actors.get(message!.speaker.actor);
                    }

                    if (message!.getFlag('od6s', 'canUseCp') &&
                        (game.user.isGM || actor!.isOwner) &&
                        (actor!.type === "character"||actor!.type === "npc") &&
                        actor!.system.characterpoints.value > 0) {
                        return true;
                    }
                }
            }
            return result;
        };

        options.push(
            {
                name: game.i18n.localize("OD6S.USE_A_CHARACTER_POINT"),
                icon: '<i class="fas fa-user-plus"></i>',
                condition: canApplyCharacterPoint,
                callback: (li: any) => {
                    const message = game.messages.get(li.attr("data-message-id"));
                    let actor;
                    if (message!.speaker.token) {
                        actor = game.scenes.viewed.tokens.filter(t => t.id === message!.speaker.token)[0].actor;
                    } else {
                        actor = game.actors.get(message!.speaker.actor);
                    }
                    return (actor as any).useCharacterPointOnRoll(message, message!.getRollData());
                }
            }
        )
    }
}
