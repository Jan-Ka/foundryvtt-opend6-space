/**
 * Roll dispatchers for the actor sheet. Each function takes the sheet
 * (instead of being a method on it) so the sheet class can stay focused
 * on Foundry's V2 lifecycle while these stay testable in isolation.
 *
 * Three of the four funnel into `od6sroll._onRollDialog` — assembling its
 * input from the triggering DOM event plus the actor's current state.
 * Two exceptions worth noting:
 *   - `rollAvailableAction` short-circuits via `item.roll(...)` when the
 *     dataset row references a real owned item, never reaching the dialog
 *     helper directly (the item path itself opens the dialog further down).
 *   - `rollBodyPoints` posts a vanilla Foundry `Roll` straight to chat —
 *     it's a one-shot strength-die roll that updates the actor's body-
 *     points cap, not a player roll that needs the modifier dialog.
 */

import {od6sroll} from "../../apps/roll";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sheet = any;

export async function rollAvailableVehicleAction(sheet: Sheet, ev: any): Promise<void> {
    const rollData: any = {score: 0, scale: 0};
    const data = ev.currentTarget.dataset;
    const actorData = sheet.document.system;

    if (data.rollable !== "true") return;

    if (["vehicleramattack", "vehiclemaneuver", "vehicledodge"].includes(data.type)) {
        rollData.score = od6sutilities.getScoreFromSkill(sheet.document,
                actorData.vehicle.specialization.value,
                actorData.vehicle.skill.value, OD6S.vehicle_actions[data.id].base)
            + actorData.vehicle.maneuverability.score;
    } else if (data.type === "vehiclesensors") {
        rollData.score = +(od6sutilities.getScoreFromSkill(sheet.document, "",
            actorData.vehicle.sensors.skill, OD6S.vehicle_actions[data.id].base)) + (+data.score);
    } else if (data.type === "vehicleshields") {
        rollData.score = od6sutilities.getScoreFromSkill(sheet.document, "",
            actorData.vehicle.shields.skill.value, OD6S.vehicle_actions[data.id].base);
    } else {
        const item = actorData.vehicle.vehicle_weapons.find((i: any) => i.id === data.id);
        if (item !== null && typeof item !== "undefined") {
            rollData.score = od6sutilities.getScoreFromSkill(sheet.document, item.system.specialization.value,
                game.i18n.localize(item.system.skill.value), item.system.attribute.value);
            rollData.score += item.system.fire_control.score;
            rollData.scale = item.system.scale.score;
            rollData.damage = item.system.damage.score;
            rollData.damage_type = item.system.damage.type;
        }
    }

    if (!rollData.scale) rollData.scale = actorData.vehicle.scale.score;
    rollData.name = game.i18n.localize(data.name);
    rollData.type = "action";
    rollData.actor = sheet.document;
    rollData.subtype = data.type;
    await od6sroll._onRollDialog(rollData);
}

export async function rollAvailableAction(sheet: Sheet, ev: any): Promise<void> {
    const rollData: any = {token: sheet.token};
    const data = ev.currentTarget.dataset;
    let name = game.i18n.localize(data.name);
    let flatPips = 0;

    if (data.rollable !== "true") return;
    if (data.id !== "") {
        const item = sheet.document.items.find((i: any) => i.id === data.id);
        if (item !== null && typeof item !== "undefined") {
            await item.roll(data.type === "parry");
            return;
        }
    }

    if (["dodge", "parry", "block"].includes(data.type)) {
        switch (data.type) {
            case "dodge": name = OD6S.actions.dodge.skill; break;
            case "parry": name = OD6S.actions.parry.skill; break;
            case "block": name = OD6S.actions.block.skill; break;
        }
        name = game.i18n.localize(name);
    }

    if (data.type === "attribute") {
        name = data.name;
        rollData.attribute = data.id;
    } else {
        let skill = sheet.document.items.find((i: any) => i.type === "skill" && i.name === name);
        if (skill !== null && typeof skill !== "undefined") {
            if (OD6S.flatSkills) {
                rollData.score = (+sheet.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                flatPips = (+skill.system.score);
            } else {
                rollData.score = (+skill.system.score)
                    + (+sheet.document.system.attributes[skill.system.attribute.toLowerCase()].score);
            }
        } else {
            skill = await od6sutilities._getItemFromWorld(name);
            if (skill !== null && typeof skill !== "undefined") {
                rollData.score = (+sheet.document.system.attributes[skill.system.attribute.toLowerCase()].score);
            } else {
                skill = await od6sutilities._getItemFromCompendium(name);
                if (skill !== null && typeof skill !== "undefined") {
                    rollData.score = (+sheet.document.system.attributes[skill.system.attribute.toLowerCase()].score);
                } else {
                    for (const a in OD6S.actions) {
                        if (OD6S.actions[a].type === ev.currentTarget.dataset.type) {
                            rollData.score = (+sheet.document.system.attributes[OD6S.actions[a].base].score);
                            break;
                        }
                    }
                }
            }
        }
    }

    if (flatPips > 0) rollData.flatpips = flatPips;
    rollData.name = name;
    rollData.type = "action";
    rollData.actor = sheet.document;
    rollData.subtype = data.type;
    await od6sroll._onRollDialog(rollData);
}

/**
 * Roll the strength dice plus the bodyPoints +20 base, hide for GMs when
 * configured, and stash the result on `system.wounds.body_points.max`.
 * Wild-die handling matches the legacy implementation: 1dw if str < 2,
 * else (str-1)d6+1dw — when the wild-die setting is on.
 */
export async function rollBodyPoints(sheet: Sheet): Promise<void> {
    const strDice = od6sutilities.getDiceFromScore(sheet.document.system.attributes.str.score
        + sheet.document.system.attributes.str.mod);
    let rollString;
    if (game.settings.get("od6s", "use_wild_die")) {
        if (strDice.dice < 2) rollString = "1dw";
        else rollString = (+strDice.dice - 1) + "d6+1dw";
    } else {
        rollString = strDice.dice + "d6";
    }
    rollString += "+" + (+strDice.pips + 20);

    const label = game.i18n.localize("OD6S.ROLLING") + " " + game.i18n.localize(OD6S.bodyPointsName);

    let rollMode: any = CONST.DICE_ROLL_MODES.PUBLIC;
    if (game.user.isGM && game.settings.get("od6s", "hide-gm-rolls")) {
        rollMode = CONST.DICE_ROLL_MODES.PRIVATE;
    }
    const roll = await new Roll(rollString).evaluate();
    await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: label,
    }, {rollMode, create: true});

    await sheet.document.update({"system.wounds.body_points.max": roll.total});
}

export async function rollPurchase(sheet: Sheet, ev: any, buyerId: any): Promise<void> {
    const item = sheet.document.items.get(ev.currentTarget.dataset.itemId);
    if (typeof item === "undefined") {
        ui.notifications.warn(game.i18n.localize("OD6S.ITEM_NOT_FOUND"));
        return;
    }
    const data: any = {
        name: game.i18n.localize("OD6S.PURCHASE") + " " + item.name,
        itemId: item.id,
        actor: (game as any).actors.get(buyerId),
        seller: sheet.document.id,
        type: "purchase",
        difficultyLevel: OD6S.difficultyShort[item.system.price],
    };
    data.score = data.actor.system.funds.score;
    await od6sroll._onRollDialog(data);
}
