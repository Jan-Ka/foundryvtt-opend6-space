import OD6S from "../../config/config-od6s";
import { wait } from "./converters";
import { boolCheck } from "./converters";
import { getDiceFromScore } from "./dice";
import { getActorFromUuid } from "./actors";
import { isCharacterActor, isVehicleActor, isWeaponItem } from "../type-guards";

/**
 * Resolve a target actor's dodge score for the auto-explosive evade check.
 * Both `OD6SCharacterSystem.dodge` and `OD6SVehicleSystem.dodge` carry a
 * `.score` field; pre-#86 code read `(actor as any).dodge` flat off the
 * actor — always undefined, so `undefined > number` always returned false
 * and the dodge branch never fired.
 */
function getDodgeScore(actor: Actor): number {
    if (isCharacterActor(actor) || isVehicleActor(actor)) {
        return Number(actor.system.dodge?.score ?? 0);
    }
    return 0;
}

/**
 * Per-throw state for an in-flight explosive, keyed by the blast region's id
 * on `flags.od6s.explosivePending`. One entry per throw lets multiple
 * unresolved instances of the same explosive item co-exist (#40) — the
 * previous scalar flags clobbered each other on the second throw.
 */
export interface ExplosivePending {
    origin: { x: number; y: number };
    range: number;
}

/** Read the per-throw pending entry for `regionId`, or undefined if absent. */
export function getExplosivePending(item: Item, regionId: string | undefined): ExplosivePending | undefined {
    if (!regionId) return undefined;
    const map = item.getFlag('od6s', 'explosivePending') as Record<string, ExplosivePending> | undefined;
    return map?.[regionId];
}

/** Delete only the entry for `regionId` from the pending map (preserves other in-flight throws). */
export async function clearExplosivePending(item: Item, regionId: string | undefined): Promise<void> {
    if (!regionId) return;
    await item.update({ [`flags.od6s.explosivePending.-=${regionId}`]: null });
}

export async function scatterExplosive(range: any, origin: any, regionId: any): Promise<void> {
    let distanceTerms = '';
    let angle = 0;

    const region = canvas.scene.getEmbeddedDocument('Region', regionId);
    const shape = region.shapes[0];
    const target = {x: shape.x, y: shape.y};
    const sourceRay = new foundry.canvas.geometry.Ray(origin, target);

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

    const destRay = foundry.canvas.geometry.Ray.fromAngle(shape.x, shape.y, newAngle, distance);

    // Check if it would collide with a wall and stop it there
    const checkCollision = CONFIG.Canvas.polygonBackends.move.testCollision(
        destRay.A, destRay.B,
        {type: "move", mode: "closest"});

    let newPos;
    if (checkCollision !== null) {
        const distanceToCollision = (canvas.grid.measurePath([destRay.A, checkCollision]).distance
            * canvas.dimensions.distancePixels) - 5;
        const collisionRay = foundry.canvas.geometry.Ray.fromAngle(shape.x, shape.y, newAngle, distanceToCollision);
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

export async function getExplosiveTargets(actor: any, itemId: any, regionId: string | undefined): Promise<any[]> {
    const item = actor.isToken ? actor.token.actor.items.get(itemId) : actor.items.get(itemId);
    if (!regionId) return [];
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
        thisTarget.range = canvas.grid.measurePath([center, target.center]).distance;
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
            targets: await getExplosiveTargets(actor, region.getFlag('od6s','item'), region.id),
            triggered: true
        }

        // Regenerate the original message
        if(region.getFlag('od6s','message')) {
            const origMessage = game.messages.get(region.getFlag('od6s','message'));
            if(typeof(origMessage) !== 'undefined') {
                const cloneMessage = (origMessage as any).clone(data);
                await origMessage.unsetFlag('od6s', 'isExplosive');
                // Blind rolls also populate `whisper`, so the blind check
                // must come first or it would never be reached.
                let rollMode = CONST.DICE_ROLL_MODES.PUBLIC;
                if (origMessage.blind) {
                    rollMode = CONST.DICE_ROLL_MODES.BLIND;
                } else if (origMessage.whisper.length > 0) {
                    rollMode = CONST.DICE_ROLL_MODES.PRIVATE;
                }
                await ChatMessage.deleteDocuments([origMessage.id]);
                cloneMessage.flags.od6s.canUseCp = false;
                cloneMessage.rolls[0].toMessage(cloneMessage, {rollMode});
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

    // Region id stamped on the attack message at creation; falls back to the
    // dataset templateId for legacy / handler-driven callers.
    const regionId = (message?.getFlag('od6s', 'template') as string | undefined) || data.templateId;

    let targets;
    if (message) {
        targets = await game!.messages!.get(data.messageId)!.getFlag('od6s', 'targets');
    } else {
        targets = await getExplosiveTargets(actor, data.itemId, regionId);
    }

    const item = actor!.items.get(data.itemId);
    const wsys = item && isWeaponItem(item) ? item.system : undefined;

    if (game.settings.get('od6s', 'auto_explosive')) {
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
    msgData.flags.od6s.damageType = wsys?.damage.type;
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
        if (!wsys) return false;
        // Separate rolls for each zone; damage score represents whole dice
        for (const i in wsys.blast_radius) {
            const zone = wsys.blast_radius[i as "1" | "2" | "3" | "4"];
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
                } else if (getDodgeScore(actor) > (message.getFlag('od6s', 'total') as number)) {
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
        if (!wsys) return false;
        // One roll, with a fraction for zones > 1
        const dice = (boolCheck(data.stun)) ? getDiceFromScore(wsys.stun.score, OD6S.pipsPerDice)
            : getDiceFromScore(wsys.damage.score, OD6S.pipsPerDice);
        if (boolCheck(data.stun)) {
            if (wsys.stun.score === 0 || (wsys.stun.score as unknown) === '') {
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_EXPLOSIVE_CONFIGURED_FOR_ZONES'));
                return;
            }
        } else {
            if (wsys.damage.score === 0 || (wsys.damage.score as unknown) === '') {
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
            if(getDodgeScore(actor) > (message!.getFlag('od6s','total') as number)) {
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
