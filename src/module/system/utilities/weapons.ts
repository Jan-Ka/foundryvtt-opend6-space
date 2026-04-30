import OD6S from "../../config/config-od6s";
import { getDiceFromScore } from "./dice";
import { getScoreFromSkill } from "./skills";

/**
 * Calculate Strength Damage die code from a Strength die count.
 * Rule: drop pips, divide by 2, round up. (Book p71, "Determining Strength Damage")
 */
export function strengthDamageFromDice(strengthDice: number): number {
    return Math.ceil(strengthDice / 2);
}

/**
 * Return range values for ranged weapons
 */
export async function getWeaponRange(actor: Actor, item: Item): Promise<Record<string, number> | false> {
    const regex = /[A-Za-z]/;
    const foundRange: any = {};
    foundRange.short = '';
    foundRange.medium = '';
    foundRange.long = '';

    const itemRange = (item.system as OD6SWeaponItemSystem).range;
    const range: any = {};
    range.short = itemRange.short;
    range.medium = itemRange.medium;
    range.long = itemRange.long;

    const numericRange = {
        short: Number(itemRange.short),
        medium: Number(itemRange.medium),
        long: Number(itemRange.long),
    };

    let baseDice;

    if (regex.test(itemRange.short) ||
        regex.test(itemRange.medium) ||
        regex.test(itemRange.long)) {
        // There is a non-numeric value, extract it and find the attribute
        for (const rangeKey of ['short', 'medium', 'long'] as const) {
            for (const attr in OD6S.attributes) {
                if (itemRange[rangeKey].toLowerCase().includes(attr)) {
                    foundRange[rangeKey] = attr;
                    break;
                }
            }
            if (foundRange[rangeKey] === '') {
                // String is present, but attribute not found.  Flee!
                ui.notifications.warn(game.i18n.localize('OD6S.WARN_INVALID_RANGE_ATTRIBUTE'));
                return false;
            }
        }
    } else {
        // No strings in range values — coerce to numbers so the return type matches.
        return numericRange;
    }
    if ((new Set([foundRange.short, foundRange.medium, foundRange.long])).size === 1) {
        baseDice = Math.floor(actor.system.attributes[foundRange.short].score / OD6S.pipsPerDice) * OD6S.pipsPerDice;
        if (!game.settings.get('od6s', 'strength_damage')) {
            // CHeck for a lift skill
            const lift = actor.items.find((skill: Item) => skill.name === game.i18n.localize("OD6S.LIFT"));
            if (lift != null && typeof (lift) !== 'undefined') {
                baseDice = getScoreFromSkill(actor, '', lift.name, 'str');
            }
        }
    } else {
        // Range attribute does not match, flee.
        ui.notifications.warn(game.i18n.localize('OD6S.WARN_INVALID_RANGE_ATTRIBUTE'));
        return false;
    }

    const newRanges = {};
    const dice = getDiceFromScore(baseDice, OD6S.pipsPerDice);

    if (game.settings.get('od6s', 'static_str_range')) {
        for (const r in range) {
            const e = range[r].match(/([+|-][0-9])$/);
            if (e) {
                (newRanges as any)[r] = (dice.dice * 4) + dice.pips + (+e[0]);
            } else {
                (newRanges as any)[r] = (dice.dice * 4) + dice.pips;
            }
        }
    } else {
        //Generate a die roll
        let rollString = dice.dice + "d6";
        if (dice.pips > 0) rollString = rollString + "+" + dice.pips;
        const roll = await new Roll(rollString).evaluate();

        for (const r in range) {
            const e = range[r].match(/([+|-][0-9])$/);
            if (e) {
                (newRanges as any)[r] = roll.total + (+e[0]);
            } else {
                (newRanges as any)[r] = roll.total;
            }
        }

        const flags: any = {}
        flags.type = "range";
        flags.range = newRanges;
        flags.origRange = range;
        const label = game.i18n.localize('OD6S.RANGE_ROLL') + ": " + item.name;
        let rollMode = 'roll';
        if (game.user.isGM && game.settings.get('od6s', 'hide-gm-rolls')) rollMode = "gm";
        await roll.toMessage({
            speaker: ChatMessage.getSpeaker(),
            flavor: label,
            flags: {
                od6s: flags
            },
            messageMode: rollMode,
            create: true
        })
    }
    return newRanges;
}

export function getMeleeDamage(actor: Actor, weapon: Item): number {
    const wsys = weapon.system as OD6SWeaponItemSystem;
    if (wsys.damage.str) {
        return (+(actor.system as OD6SCharacterSystem).strengthdamage.score) + (+wsys.damage.score);
    } else {
        return (+wsys.damage.score);
    }
}
