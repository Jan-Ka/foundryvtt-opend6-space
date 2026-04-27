import {od6sroll} from "../../apps/roll";
import {od6sInitRoll} from "../../apps/init-roll";
import {od6sadvance} from "../advance";
import {od6sspecialize} from "../specialize";
import {od6sattributeedit} from "../attribute-edit";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

/**
 * Register score-related event listeners (attributes, skills, specializations,
 * advances, funds, toughness, maneuverability, body points, etc.) on the actor sheet.
 */
export function registerScoreListeners(html: any, sheet: any): void {
    const el = html[0];

    // Rollable abilities.
    const rollDialog = new (od6sroll);
    el.querySelectorAll('.rolldialog').forEach((elem: any) =>
        elem.addEventListener('click', rollDialog._onRollEvent.bind(sheet)));
    el.querySelectorAll('.initrolldialog').forEach((elem: any) =>
        elem.addEventListener('click', od6sInitRoll._onInitRollDialog.bind(sheet)));
    el.querySelectorAll('.actionroll').forEach((elem: any) =>
        elem.addEventListener('click', rollDialog._onRollItem.bind(sheet)));

    // Attribute/skill advances
    const advanceDialog = new (od6sadvance);
    el.querySelectorAll('.advancedialog').forEach((elem: any) =>
        elem.addEventListener('click', advanceDialog._onAdvance.bind(sheet)));

    // Attribute context menu (no-op handlers preserved)
    el.querySelectorAll('.attributedialog').forEach((elem: any) =>
        elem.addEventListener('contextmenu', () => {}));

    // Skill context menu (no-op handlers preserved)
    el.querySelectorAll('.skilldialog').forEach((elem: any) =>
        elem.addEventListener('contextmenu', () => {}));

    // Skill specialization
    const specializeDialog = new (od6sspecialize);
    el.querySelectorAll('.specializedialog').forEach((elem: any) =>
        elem.addEventListener('click', specializeDialog._onSpecialize.bind(sheet)));

    // Free edit attribute
    const attributeEditDialog = new od6sattributeedit();
    el.querySelectorAll('.attribute-edit').forEach((elem: any) =>
        elem.addEventListener('click', attributeEditDialog._onAttributeEdit.bind(sheet)));

    // Edit funds
    el.querySelectorAll('.edit-funds').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const newScore: any = {};
            newScore.dice = 0;
            newScore.pips = 0;
            let updateScore = 0;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.funds.score);
            if (ev.target.id === 'funds-dice') {
                newScore.pips = oldScore.pips;
                newScore.dice = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            } else if (ev.target.id === 'funds-pips') {
                newScore.dice = oldScore.dice;
                newScore.pips = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            }
            const update: any = {};
            update.id = sheet.document.id;
            update[`system.funds.score`] = updateScore;
            await sheet.document.update(update);
            sheet.render();
        }));

    // Edit maneuverability
    el.querySelectorAll('.edit-maneuverability').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const newScore: any = {};
            newScore.dice = 0;
            newScore.pips = 0;
            let updateScore = 0;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.maneuverability.score);
            if (ev.target.id === 'maneuverability-dice') {
                newScore.pips = oldScore.pips;
                newScore.dice = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            } else if (ev.target.id === 'maneuverability-pips') {
                newScore.dice = oldScore.dice;
                newScore.pips = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            }
            const update: any = {};
            update.id = sheet.document.id;
            update[`system.maneuverability.score`] = updateScore;
            await sheet.document.update(update);
            sheet.render();
        }));

    // Edit toughness
    el.querySelectorAll('.edit-toughness').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            const newScore: any = {};
            newScore.dice = 0;
            newScore.pips = 0;
            let updateScore = 0;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.toughness.score);
            if (ev.target.id === 'toughness-dice') {
                newScore.pips = oldScore.pips;
                newScore.dice = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            } else if (ev.target.id === 'toughness-pips') {
                newScore.dice = oldScore.dice;
                newScore.pips = (+ev.target.value);
                updateScore = od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
            }
            const update: any = {};
            update.id = sheet.document.id;
            update[`system.toughness.score`] = updateScore;
            await sheet.document.update(update);
            sheet.render();
        }));

    // Edit body points
    el.querySelectorAll('.editbodypoints').forEach((elem: any) =>
        elem.addEventListener('change', async (ev: any) => {
            await (sheet.document as any).setWoundLevelFromBodyPoints(ev.target.value);
            sheet.render();
        }));

    // Roll Body Points
    el.querySelectorAll('.rollbodypoints').forEach((elem: any) =>
        elem.addEventListener('click', async (_ev: any) => {
            const confirmText = "<p>" + game.i18n.localize("OD6S.CONFIRM_ROLL_BODYPOINTS") + "</p>";
            await Dialog.prompt({
                title: game.i18n.localize("OD6S.ROLL") + " " + game.i18n.localize(OD6S.bodyPointsName),
                content: confirmText,
                callback: () => {
                    return sheet._rollBodyPoints();
                }
            })
        }));

    // Edit active effect (score-related effects)
    el.querySelectorAll('.edit-effect').forEach((elem: any) =>
        elem.addEventListener('click', async (ev: any) => {
            await sheet._editEffect(ev);
        }));

    // Event listener for skill usage checkboxes
    el.querySelectorAll('.skill-used-checkbox, .spec-used-checkbox').forEach((elem: any) =>
        elem.addEventListener('change', async (event: any) => {
            const itemId = event.currentTarget.dataset.itemId;
            const item = sheet.document.items.get(itemId);

            if (item) {
                await item.update({'system.used.value': event.currentTarget.checked})
                    .catch((err: any) => console.error('Failed to update item used status:', err));
            }
        }));

    // Event listener for Session Reset button
    el.querySelectorAll('.session-reset-button').forEach((elem: any) =>
        elem.addEventListener('click', (_event: any) => {
            const checkboxes = el.querySelectorAll('.skill-used-checkbox, .spec-used-checkbox');
            checkboxes.forEach((checkbox: any) => {
                const itemId = checkbox.dataset.itemId;
                const item = sheet.document.items.get(itemId);
                if (item) {
                    item.update({'system.used.value': false}).catch((err: any) => console.error(err));
                    checkbox.checked = false;
                } else {
                    console.error("Item not found for reset: ", itemId);
                }
            });
        }));
}
