import OD6S from "../../config/config-od6s";
import { wait } from "./converters";
import { boolCheck } from "./converters";
import { getDiceFromScore } from "./dice";
import { getActorFromUuid } from "./actors";

export async function scatterExplosive(range: any, origin: any, regionId: any): Promise<void> {
    let distanceTerms = '';
    let angle = 0;

    const region = canvas.scene.getEmbeddedDocument('Region', regionId);
    const shape = region.shapes[0];
    const target = {x: shape.x, y: shape.y};
    const sourceRay = new Ray(origin, target);

    // Save original position for un-scatter on hit
    await region.setFlag('od6s', 'originalX', shape.x);
    await region.setFlag('od6s', 'originalY', shape.y);

    const scatterRoll = await new Roll('1d6').evaluate();
    const scatter = scatterRoll.total;

    switch(range) {
        case 'OD6S.RANGE_POINT_BLANK_SHORT':
            distanceTerms = '1d6';
            break;
        case 'OD6S.RANGE_SHORT_SHORT':
            distanceTerms = '1d6';
            break;
        case 'OD6S.RANGE_MEDIUM_SHORT':
            distanceTerms = '2d6';
            break;
        case 'OD6S.RANGE_LONG_SHORT':
            distanceTerms = '3d6';
            break;
        default:
            break;
    }

    const distanceRoll = await new Roll(distanceTerms).evaluate();
    const distance = distanceRoll.total * (canvas.dimensions.distancePixels);

    switch(scatter) {
        case 1:
            angle = 180 * (Math.PI/180);
            break;
        case 2:
            angle = -90 * (Math.PI/180);
            break;
        case 3:
            angle = -45 * (Math.PI/180);
            break;
        case 4:
            angle = 0;
            break;
        case 5:
            angle = 45 * (Math.PI/180);
            break;
        case 6:
            angle = 90 * (Math.PI/180);
            break
        default:
            break;
    }

    const newAngle = sourceRay.angle + angle;

    const destRay = Ray.fromAngle(shape.x, shape.y, newAngle, distance);

    // Check if it would collide with a wall and stop it there
    const checkCollision = CONFIG.Canvas.polygonBackends.move.testCollision(
        destRay.A, destRay.B,
        {type: "move", mode: "closest"});

    let newPos;
    if (checkCollision !== null) {
        const distanceToCollision = (canvas.grid.measureDistance(destRay.A, checkCollision)
            * canvas.dimensions.distancePixels) - 5;
        const collisionRay = Ray.fromAngle(shape.x, shape.y, newAngle, distanceToCollision);
        newPos = { x: collisionRay.B.x, y: collisionRay.B.y };
    } else {
        newPos = { x: Math.floor(destRay.B.x), y: Math.floor(destRay.B.y) };
    }

    // Update the region shape position
    const updatedShapes = foundry.utils.deepClone(region.shapes);
    updatedShapes[0].x = newPos.x;
    updatedShapes[0].y = newPos.y;
    await region.update({ shapes: updatedShapes });
    await wait(100);
}

export async function getExplosiveTargets(actor: any, itemId: any): Promise<any[]> {
    const item = actor.isToken ? actor.token.actor.items.get(itemId) : actor.items.get(itemId);
    const regionId = item.getFlag('od6s', 'explosiveTemplate');
    const region = canvas.scene.getEmbeddedDocument('Region', regionId);
    if (!region) return [];
    const shape = region.shapes[0];
    const center = { x: shape.x, y: shape.y };
    const radiusPixels = shape.radiusX || shape.radius || 0;

    // Find tokens within the blast radius using distance calculation
    const tokens = canvas.tokens.placeables.filter(t => {
        const dx = t.center.x - center.x;
        const dy = t.center.y - center.y;
        return Math.sqrt(dx * dx + dy * dy) <= radiusPixels;
    });

    // Filter out tokens that have a wall between them and the center
    const hitTokens = tokens.filter(
        t => (!CONFIG.Canvas.polygonBackends.move.testCollision(center, t.center, {type: "move", mode: "any"}) ||
            !CONFIG.Canvas.polygonBackends.sight.testCollision(center, t.center, {type: "sight", mode: "any"}))
    );

    // Calculate range to each
    const targets = [];
    for (const target of hitTokens) {
        const thisTarget: any = {};
        thisTarget.id = target.id;
        thisTarget.range = canvas.grid.measureDistance(center, target.center);
        thisTarget.zone = getBlastRadius(item, thisTarget.range);
        thisTarget.name = target.name;
        targets.push(thisTarget);
    }

    return targets;
}

export async function detonateExplosives(combat: any): Promise<void> {
    // Find all active explosive regions on the scene and detonate
    const regions = combat.scene.regions?.filter((i: any) => i.flags?.od6s?.explosive === true) ?? [];
    for (const region of regions) {
        await region.update({ visibility: 2 }); // Make visible to all
        let actor;
        if (typeof(region.getFlag('od6s','token')) === 'undefined' || region.getFlag('od6s','token') === '') {
            actor = await getActorFromUuid(region.getFlag('od6s', 'actor'))
        } else {
            actor = game!.scenes!.active!.tokens.get(region.getFlag('od6s', 'token'))!.actor;
        }

        const data: any = {};
        data.flags = {};
        data.flags.od6s = {
            actorId: region.getFlag('od6s','actor'),
            tokenId: region.getFlag('od6s', 'token'),
            itemId: region.getFlag('od6s','item'),
            templateId: region.id,
            targets: await getExplosiveTargets(actor, region.getFlag('od6s','item')),
            triggered: true
        }

        // Regenerate the original message
        if(region.getFlag('od6s','message')) {
            const origMessage = game.messages.get(region.getFlag('od6s','message'));
            if(typeof(origMessage) !== 'undefined') {
                const cloneMessage = (origMessage as any).clone(data);
                await origMessage.unsetFlag('od6s', 'isExplosive');
                let rollMode = "public";
                if(origMessage.whisper.length > 0) {
                    rollMode = "gm";
                } else if (origMessage.blind) {
                    rollMode = "blind";
                }
                await (ChatMessage as any).deleteDocuments([origMessage.id]);
                cloneMessage.flags.od6s.canUseCp = false;
                cloneMessage.rolls[0].toMessage(cloneMessage, {messageMode: rollMode});
            }
        }
    }
}

export async function detonateExplosive(data: any): Promise<any> {
    const message = game.messages.get(data.messageId);
    let actor;
    if (typeof(data.tokenId) === 'undefined' || data.tokenId === '') {
        actor = await getActorFromUuid(data.actorId);
    } else {
        const token = game.scenes!.active!.tokens.get(data.tokenId);
        actor = token!.actor;
    }

    let targets;
    if (message) {
        targets = await game!.messages!.get(data.messageId)!.getFlag('od6s', 'targets');
    } else {
        targets = await getExplosiveTargets(actor, data.itemId);
    }

    const item = actor!.items.get(data.itemId);

    if (game.settings.get('od6s', 'auto_explosive')) {
        const regionId = item!.getFlag('od6s', 'explosiveTemplate');
        const region = regionId ? canvas.scene.getEmbeddedDocument('Region', regionId) : null;

        if (region) {
            if (region.isOwner) {
                await canvas.scene.deleteEmbeddedDocuments('Region', [region.id]);
            } else {
                await OD6S.socket.executeAsGM('deleteExplosiveRegion', {regionId: region.id});
            }
        }
    }



    // Create damage chat message
    const msgData: any = {};

    msgData.flags = {};
    msgData.flags.od6s = {};
    msgData.flags.od6s.targets = [];
    msgData.flags.od6s.item = item!.id;
    msgData.flags.od6s.isOpposable = true;
    msgData.flags.od6s.damageType = item!.system.damage.type;
    msgData.flags.od6s.stun = data.stun;
    msgData.flags.od6s.attackMessage = data.messageId;

    msgData.flags.od6s.type = "explosive";

    if (boolCheck(data.stun)) {
        msgData.flavor = game.i18n.localize("OD6S.EXPLOSIVE_STUN_DAMAGE");
    } else {
        msgData.flavor = game.i18n.localize("OD6S.EXPLOSIVE_DAMAGE");
    }
    msgData.speaker = {};
    msgData.speaker.alias = actor!.name;
    msgData.speaker.actor = actor!.id;
    msgData.speaker.token = actor!.isToken ? actor!.token.id : '';
    msgData.speaker.scene = game.scenes!.active!.id;

    let rollString;

    if(game.settings.get('od6s','explosive_zones')) {
        // Separate rolls for each zone; damage score represents whole dice
        for (const i in item!.system.blast_radius) {
            const zone = item!.system.blast_radius[i];
            const zoneTargets = targets.filter((target: any) => target.zone === (+i));
            if (zoneTargets.length < 1) continue;
            if (zone.damage < 1) {
                ui.notifications.warn(game.i18n.localize("OD6S.WARN_NO_DICE_FOR_ZONE"));
                return false;
            }
            let dice = zone.damage;
            if (game.settings.get('od6s', 'use_wild_die')) {
                dice = dice - 1;
                if (dice < 1) {
                    rollString = "1dw" + game.i18n.localize("OD6S.WILD_DIE_FLAVOR") + " ["
                        + game.i18n.localize('OD6S.ZONE') + "]" ;
                } else {
                    rollString = dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR') + "+1dw" +
                        game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
                }
            } else {
                rollString = dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR');
            }
            const roll  = await new Roll(rollString).evaluate();
            for (const target in zoneTargets) {
                const targetId = zoneTargets[target].id;
                if (typeof (actor) === 'undefined') actor = game!.scenes!.active!.tokens.get(targetId)!.actor;
                if (typeof (actor) === 'undefined') continue;
                let damage;
                if(!message) {
                    // TODO: Figure out a better way to deal with this
                    damage = roll.total;
                } else if ((actor as any).dodge > message.getFlag('od6s', 'total')) {
                    damage = 0;
                } else {
                    damage = roll.total;
                }
                if (game.settings.get('od6s', 'auto_explosive')) {
                    // noop
                } else {
                    msgData.flags.od6s.apply = true;
                }
                msgData.flags.od6s.targets[target] = zoneTargets[target];
                msgData.flags.od6s.targets[target].damage = damage;
            }
            if (boolCheck(data.stun)) {
                msgData.flavor = game.i18n.localize('OD6S.ZONE') + " " + i + " "
                    + game.i18n.localize("OD6S.EXPLOSIVE_STUN_DAMAGE");
            } else {
                msgData.flavor = game.i18n.localize('OD6S.ZONE') + " " + i + " "
                    + game.i18n.localize("OD6S.EXPLOSIVE_DAMAGE");
            }
            await roll.toMessage(msgData);
            msgData.flags.od6s.targets = [];
        }
    } else {
        msgData.flags.od6s.targets = targets;
        // One roll, with a fraction for zones > 1
        const dice = (boolCheck(data.stun)) ? getDiceFromScore(item!.system.stun.score, OD6S.pipsPerDice)
            : getDiceFromScore(item!.system.damage.score, OD6S.pipsPerDice);
        if (boolCheck(data.stun)) {
            if (item!.system.stun.score === 0 || item!.system.stun.score === '') {
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_EXPLOSIVE_CONFIGURED_FOR_ZONES'));
                return;
            }
        } else {
            if (item!.system.damage.score === 0 || item!.system.damage.score === '') {
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_EXPLOSIVE_CONFIGURED_FOR_ZONES'));
                return;
            }
        }
        if (game.settings.get('od6s', 'use_wild_die')) {
            dice.dice = (+dice.dice) - 1;
            if (dice.dice < 1) {
                rollString = "1dw" + game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
            } else {
                rollString = dice.dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR') + "+1dw" +
                    game.i18n.localize("OD6S.WILD_DIE_FLAVOR");
            }
        } else {
            rollString = dice.dice + "d6" + game.i18n.localize('OD6S.BASE_DIE_FLAVOR');
        }
        const roll = await new Roll(rollString).evaluate();
        // Iterate over targets
        for (const i in targets) {
            const target = targets[i];
            let damage = roll.total;
            let actor = await game.actors.get(target.id);
            if (typeof (actor) === 'undefined') actor = game!.scenes!.active!.tokens.get(target.id)!.actor;
            if(typeof(actor) === 'undefined') continue;
            if((actor as any).dodge > message!.getFlag('od6s','total')) {
                // noop
            } else {
                switch(target.zone) {
                    case 1:
                        // full damage
                        break;
                    case 2:
                        damage = Math.floor(damage * 0.5);
                        break;
                    case 3:
                        damage = Math.floor(damage *0.25);
                        break;
                    default:
                        damage = 0;
                }

                msgData.flags.od6s.targets[i].damage = damage;

                if (game.settings.get('od6s', 'auto_explosive')) {
                    // noop
                } else {
                    msgData.flags.od6s.apply = true;
                }
            }
        }
        await roll.toMessage(msgData);
    }
}

/**
 * @param item
 * @param range (in meters)
 * @returns zone
 */
export function getBlastRadius(item: any, range: any): number {
    let zone = 1;
    const maxZone = game.settings.get('od6s', 'explosive_zones') ? 4 : 3;

    for (let i=1; i < maxZone + 1; i++) {
        if (range > item.system.blast_radius[i].range) {
            zone++;
        } else {
            break;
        }
    }

    return zone;
}

/**
 * Pure version of getBlastRadius with no Foundry dependency.
 *
 * @param range   Distance from the explosion origin (meters).
 * @param radii   Zone boundary ranges in ascending order.
 *                radii[0] = zone 1 outer edge, radii[1] = zone 2 outer edge, …
 *                Corresponds to item.system.blast_radius[1..maxZone].range.
 * @param maxZone Number of zones to check (3 without explosive_zones, 4 with).
 * @returns 1-based zone number (zone 1 is closest, higher numbers are further out).
 */
export function computeBlastZone(range: number, radii: number[], maxZone: number): number {
    let zone = 1;
    for (let i = 0; i < maxZone; i++) {
        if (range > radii[i]) {
            zone++;
        } else {
            break;
        }
    }
    return zone;
}
