import OD6S from "../../config/config-od6s";

export function waitFor3DDiceMessage(targetMessageId: string): Promise<boolean> {
    function buildHook(resolve: (value: boolean) => void) {
        Hooks.once('diceSoNiceRollComplete', (messageId) => {
            if (targetMessageId === messageId)
                resolve(true);
            else
                buildHook(resolve)
        });
    }

    return new Promise((resolve, _reject) => {
        if (game.dice3d) {
            buildHook(resolve);
        } else {
            resolve(true);
        }
    });
}

export function getTemplateFromMessage(message: ChatMessage): { actor: Actor | undefined; item: Item | undefined; template: RegionDocument | null } {
    let actor;
    if (message.speaker.token !== '') {
        actor = game!.scenes!.get(message.speaker.scene)!.tokens.get(message.speaker.token)!.object!.actor;
    } else {
        actor = game.actors.get(message.speaker.actor);
    }
    const item = actor!.items.get(message.getFlag('od6s', 'itemId'));
    const regionId = item?.getFlag('od6s', 'explosiveTemplate');
    const data: any = {};
    data.actor = actor;
    data.item = item;
    data.template = regionId ? canvas.scene.getEmbeddedDocument('Region', regionId) : null;
    return data;
}

export function lookupAttributeKey(id: string): string | false {
    const attr = id.toLowerCase();
    const key = Object.keys(OD6S.attributes).find(k=>OD6S.attributes[k].shortName.toLowerCase() === attr);

    if (typeof(key) !== "undefined" && key !== null) {
        return key
    } else {
        ui.notifications.warn(game.i18n.localize('OD6S.ATTRIBUTE_NOT_FOUND'));
        return false;
    }
}
