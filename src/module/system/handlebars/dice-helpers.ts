/**
 * Dice and score-related Handlebars helpers.
 */
import OD6S from "../../config/config-od6s";

export function registerDiceHelpers() {
    Handlebars.registerHelper('diceFromScore', function (score) {
        return Math.floor(score / OD6S.pipsPerDice);
    });

    Handlebars.registerHelper('scaleDiceFromScore', function (score) {
        return Math.floor(score / OD6S.pipsPerDice) * -1;
    });

    Handlebars.registerHelper('pipsFromScore', function (score) {
        return score % OD6S.pipsPerDice;
    });

    Handlebars.registerHelper('scalePipsFromScore', function (score) {
        return score % OD6S.pipsPerDice * -1;
    });

    Handlebars.registerHelper('maxPips', function () {
        return OD6S.pipsPerDice - 1;
    });

    Handlebars.registerHelper('setDice', function (dice, actionPenalty, woundPenalty, stunnedPenalty, otherPenalty) {
        let newDice = (+dice) - (+actionPenalty) - (+woundPenalty) - (+stunnedPenalty) - (+otherPenalty);
        if (newDice <= 0) {
            newDice = 0;
        }
        return newDice;
    })

    Handlebars.registerHelper('showScaleDamage', function (v) {
        let string = "";
        v > 0 ? string += "+" : string += "-";
        string += Math.abs(v);
        return string;
    })

    Handlebars.registerHelper('diceForScale', function () {
        return game.settings.get('od6s', 'dice_for_scale');
    })
}
