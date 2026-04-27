/**
 * Explosive-related Handlebars helpers.
 */
import {od6sutilities} from "../utilities";

export function registerExplosiveHelpers() {
    Handlebars.registerHelper('isExplosivesAuto', function() {
        return game.settings.get('od6s', 'auto_explosive');
    })

    Handlebars.registerHelper('notExplosivesEndOfRound', function() {
        return !game.settings.get('od6s', 'explosive_end_of_round');
    })

    Handlebars.registerHelper('getExplosiveZones', function(key) {
        const zones = game.settings.get('od6s', 'explosive_zones') ? 4 : 3;
        return (key <= zones);
    })

    Handlebars.registerHelper('getExplosiveZonesCount', function() {
        const zones = [];
        for (let i = 1; i <= (game.settings.get('od6s', 'explosive_zones') ? 4 : 3); i++) {
            zones.push(i);
        }
        return zones;
    });

    Handlebars.registerHelper('getExplosiveTargets', async (actorId, itemId) => {
        return await od6sutilities.getExplosiveTargets(actorId, itemId);
    })

    Handlebars.registerHelper('checkExplosiveTargets', (targets) => {

        if (typeof (targets) === 'undefined' || targets === '') {
            return false;
        }
        return Object.keys(targets).length > 0;
    })

    Handlebars.registerHelper('isExplosiveSet', async (actorUuid,weaponId) => {
        const actor = await od6sutilities.getActorFromUuid(actorUuid);
        actor!.items.get(weaponId);
    })
}
