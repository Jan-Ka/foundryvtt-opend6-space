import {od6sroll} from "../../apps/roll";
import {od6sInitRoll} from "../../apps/init-roll";
import {od6sadvance} from "../advance";
import {od6sspecialize} from "../specialize";
import {od6sattributeedit} from "../attribute-edit";
import {od6sutilities} from "../../system/utilities";
import OD6S from "../../config/config-od6s";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const foundry: any;

interface DiceScore { dice: number; pips: number }

/**
 * Build an updated score for an "edit-X" two-input control: one input changes
 * dice while the other holds pips (or vice versa). Returns the new total score.
 */
function recalcScoreFromInput(
    target: HTMLInputElement,
    diceInputId: string,
    pipsInputId: string,
    oldScore: DiceScore,
): number {
    const newScore: DiceScore = {dice: 0, pips: 0};
    if (target.id === diceInputId) {
        newScore.pips = oldScore.pips;
        newScore.dice = +target.value;
    } else if (target.id === pipsInputId) {
        newScore.dice = oldScore.dice;
        newScore.pips = +target.value;
    } else {
        return od6sutilities.getScoreFromDice(oldScore.dice, oldScore.pips);
    }
    return od6sutilities.getScoreFromDice(newScore.dice, newScore.pips);
}

/**
 * Register the play-mode-safe roll triggers (skill/attribute/spec/init click,
 * weapon-action click, body-points roll). Bound regardless of `isEditable` —
 * V2 sheets render in PLAY mode by default, where `isEditable` is false, but
 * rolling is a play-mode action and must work for any owner.
 */
export function registerRollListeners(
    html: HTMLElement[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {
    const el = html[0];

    const rollDialog = new (od6sroll);
    el.querySelectorAll<HTMLElement>('.rolldialog').forEach((elem) =>
        elem.addEventListener('click', rollDialog._onRollEvent.bind(sheet)));
    el.querySelectorAll<HTMLElement>('.initrolldialog').forEach((elem) =>
        elem.addEventListener('click', od6sInitRoll._onInitRollDialog.bind(sheet) as unknown as EventListener));
    el.querySelectorAll<HTMLElement>('.actionroll').forEach((elem) =>
        elem.addEventListener('click', rollDialog._onRollItem.bind(sheet)));

    el.querySelectorAll<HTMLElement>('.rollbodypoints').forEach((elem) =>
        elem.addEventListener('click', async () => {
            const ok = await foundry.applications.api.DialogV2.confirm({
                window: {title: game.i18n.localize("OD6S.ROLL") + " " + game.i18n.localize(OD6S.bodyPointsName)},
                content: `<p>${game.i18n.localize("OD6S.CONFIRM_ROLL_BODYPOINTS")}</p>`,
            });
            if (ok) await sheet._rollBodyPoints();
        }));
}

/**
 * Register score-related event listeners (attributes, skills, specializations,
 * advances, funds, toughness, maneuverability, body points, etc.) on the actor sheet.
 */
export function registerScoreListeners(
    html: HTMLElement[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
): void {
    const el = html[0];

    // Attribute/skill advances
    const advanceDialog = new (od6sadvance);
    el.querySelectorAll<HTMLElement>('.advancedialog').forEach((elem) =>
        elem.addEventListener('click', advanceDialog._onAdvance.bind(sheet)));

    // Attribute context menu (no-op handlers preserved)
    el.querySelectorAll<HTMLElement>('.attributedialog').forEach((elem) =>
        elem.addEventListener('contextmenu', () => {}));

    // Skill context menu (no-op handlers preserved)
    el.querySelectorAll<HTMLElement>('.skilldialog').forEach((elem) =>
        elem.addEventListener('contextmenu', () => {}));

    // Skill specialization
    const specializeDialog = new (od6sspecialize);
    el.querySelectorAll<HTMLElement>('.specializedialog').forEach((elem) =>
        elem.addEventListener('click', specializeDialog._onSpecialize.bind(sheet)));

    // Free edit attribute
    const attributeEditDialog = new od6sattributeedit();
    el.querySelectorAll<HTMLElement>('.attribute-edit').forEach((elem) =>
        elem.addEventListener('click', attributeEditDialog._onAttributeEdit.bind(sheet)));

    // Edit funds
    el.querySelectorAll<HTMLElement>('.edit-funds').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.funds.score);
            const updateScore = recalcScoreFromInput(target, 'funds-dice', 'funds-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.funds.score': updateScore});
            sheet.render();
        }));

    // Edit maneuverability
    el.querySelectorAll<HTMLElement>('.edit-maneuverability').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.maneuverability.score);
            const updateScore = recalcScoreFromInput(target, 'maneuverability-dice', 'maneuverability-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.maneuverability.score': updateScore});
            sheet.render();
        }));

    // Edit toughness
    el.querySelectorAll<HTMLElement>('.edit-toughness').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            const oldScore = od6sutilities.getDiceFromScore(sheet.document.system.toughness.score);
            const updateScore = recalcScoreFromInput(target, 'toughness-dice', 'toughness-pips', oldScore);
            await sheet.document.update({id: sheet.document.id, 'system.toughness.score': updateScore});
            sheet.render();
        }));

    // Edit body points
    el.querySelectorAll<HTMLElement>('.editbodypoints').forEach((elem) =>
        elem.addEventListener('change', async (ev: Event) => {
            const target = ev.target as HTMLInputElement;
            await sheet.document.setWoundLevelFromBodyPoints(+target.value);
            sheet.render();
        }));

    // Edit active effect (score-related effects)
    el.querySelectorAll<HTMLElement>('.edit-effect').forEach((elem) =>
        elem.addEventListener('click', async (ev: Event) => {
            await sheet._editEffect(ev);
        }));

    // Event listener for skill usage checkboxes
    el.querySelectorAll<HTMLInputElement>('.skill-used-checkbox, .spec-used-checkbox').forEach((elem) =>
        elem.addEventListener('change', async (event: Event) => {
            const ct = event.currentTarget as HTMLInputElement;
            const itemId = ct.dataset.itemId;
            const item = sheet.document.items.get(itemId);

            if (item) {
                await item.update({'system.used.value': ct.checked})
                    .catch((err: unknown) => console.error('Failed to update item used status:', err));
            }
        }));

    // Event listener for Session Reset button
    el.querySelectorAll<HTMLElement>('.session-reset-button').forEach((elem) =>
        elem.addEventListener('click', () => {
            const checkboxes = el.querySelectorAll<HTMLInputElement>('.skill-used-checkbox, .spec-used-checkbox');
            checkboxes.forEach((checkbox) => {
                const itemId = checkbox.dataset.itemId;
                const item = sheet.document.items.get(itemId);
                if (item) {
                    item.update({'system.used.value': false}).catch((err: unknown) => console.error(err));
                    checkbox.checked = false;
                } else {
                    console.error("Item not found for reset: ", itemId);
                }
            });
        }));
}
