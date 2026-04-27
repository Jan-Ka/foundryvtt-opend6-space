import {od6sutilities} from "../system/utilities";

export function registerRegionHooks() {
    // Scene Region hooks for explosive system
    Hooks.on('updateRegion', async (region, change) => {
        if (!game.user.isGM) return;
        if (!region.getFlag('od6s', 'explosive')) return;
        if (change.flags?.od6s?.messageId) return;

        if (region.getFlag('od6s', 'messageId') && !region.getFlag('od6s', 'handled')) {
            const message = game.messages.get(region.getFlag('od6s', 'messageId'));
            if (message) {
                let actor;
                if (message.speaker.token !== '' && message.speaker.token !== null) {
                    // @ts-expect-error
                    actor = game!.scenes.get(message.speaker.scene).tokens.get(message.speaker.token).object.actor;
                } else {
                    actor = game.actors.get(message.speaker.actor);
                }
                const targets = await od6sutilities.getExplosiveTargets(
                    actor,
                    region.getFlag('od6s', 'item'));
                await message.unsetFlag('od6s', 'targets');
                await message.setFlag('od6s', 'targets', targets);
                await message.render();
            }
        }
    })

    // Delete explosive region hook
    Hooks.on('deleteRegion', async (region) => {
        if (!game.settings.get('od6s', 'auto_explosive') || !game.user.isGM) return;
        if (!region.getFlag('od6s', 'explosive')) return;

        // Delete the flags from the item that generated the region
        let actor;
        if (region.getFlag('od6s', 'token')) {
            const token = game.scenes.active.tokens.get(region.getFlag('od6s', 'token'));
            actor = token?.actor;
        } else {
            actor = await od6sutilities.getActorFromUuid(region.getFlag('od6s', 'actor'));
        }
        if (actor) {
            const item = actor.items.get(region.getFlag('od6s', 'item'));
            if (item) {
                await item.update({
                    "flags.od6s.-=explosiveOrigin": null,
                    "flags.od6s.-=explosiveRange": null,
                    "flags.od6s.-=explosiveSet": null,
                    "flags.od6s.-=explosiveTemplate": null,
                });
            }
        }
        if (region.getFlag('od6s', 'messageId') && !region.getFlag('od6s', 'handled')) {
            const message = game.messages.get(region.getFlag('od6s', 'messageId'));
            if (message) await message.delete();
        }
    })
}
