import {od6sutilities} from "../system/utilities";
import {error as logError} from "../system/logger";

export function registerRegionHooks() {
    // Scene Region hooks for explosive system
    Hooks.on('updateRegion', async (region, change) => {
        try {
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
                        region.getFlag('od6s', 'item'),
                        region.id);
                    await message.unsetFlag('od6s', 'targets');
                    await message.setFlag('od6s', 'targets', targets);
                    await message.render();
                }
            }
        } catch (err) {
            logError('region-hooks', 'updateRegion failed', err);
        }
    })

    // Delete explosive region hook
    Hooks.on('deleteRegion', async (region) => {
        try {
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
                    // Drop only the entry for this region — other in-flight
                    // throws of the same item retain their own pending state (#40).
                    await item.update({
                        [`flags.od6s.explosivePending.-=${region.id}`]: null,
                    });
                }
            }
            if (region.getFlag('od6s', 'messageId') && !region.getFlag('od6s', 'handled')) {
                const message = game.messages.get(region.getFlag('od6s', 'messageId'));
                if (message) await message.delete();
            }
        } catch (err) {
            logError('region-hooks', 'deleteRegion failed', err);
        }
    })
}
