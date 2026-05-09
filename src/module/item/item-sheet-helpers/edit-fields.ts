/**
 * Sheet helpers for the dice/pip numeric editors on item sheets
 * (skill base, specialization base, weapon damage/stun/fire-control, armor pr/er).
 * Extracted from item-sheet.ts; behaviour preserved.
 */

import {od6sutilities} from "../../system/utilities";

interface SheetLike {
    item: Item;
    actor: Actor | null;
    render(force?: boolean, options?: object): unknown;
}

function rerollScore(
    inputId: string,
    inputValue: string,
    oldDice: {dice: number; pips: number},
    diceKey: string,
    pipsKey: string,
): number | undefined {
    if (inputId === diceKey) return od6sutilities.getScoreFromDice(Number(inputValue), oldDice.pips);
    if (inputId === pipsKey) return od6sutilities.getScoreFromDice(oldDice.dice, Number(inputValue));
    return undefined;
}

export async function editSkill(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const input = event.target as HTMLInputElement;
    const itemId = target.dataset.itemId;
    const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.base ?? 0));
    const newScore = rerollScore(input.id, input.value, oldDice, "dice", "pips");
    if (sheet.actor != null) {
        await sheet.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
        await sheet.item.sheet.render(false, {log: true});
    } else {
        await sheet.item.update({id: sheet.item.id, _id: sheet.item.id, "system.base": newScore});
    }
}

export async function editSpecialization(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const input = event.target as HTMLInputElement;
    const itemId = target.dataset.itemId;
    const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
    const newScore = rerollScore(input.id, input.value, oldDice, "system.die.dice", "system.die.pips");
    if (sheet.actor != null) {
        await sheet.actor.updateEmbeddedDocuments("Item", [{id: itemId, _id: itemId, "system.base": newScore}]);
        await sheet.item.sheet.render(false, {log: true});
    } else {
        await sheet.item.update({id: itemId, "system.base": newScore}, {diff: true});
    }
}

async function editScoreField(
    sheet: SheetLike,
    event: Event,
    embeddedSystemPatch: (newDamage: number | undefined) => Record<string, unknown>,
    standaloneFieldPath: string,
): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const input = event.target as HTMLInputElement;
    const itemId = target.dataset.itemId;
    if (target.dataset.score === "") target.dataset.score = "0";
    const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
    const newDamage = rerollScore(input.id, input.value, oldDice, "dice", "pips");

    if (sheet.actor != null) {
        await sheet.actor.updateEmbeddedDocuments("Item", [{_id: itemId, system: embeddedSystemPatch(newDamage)}]);
    } else {
        await sheet.item.update({[standaloneFieldPath]: newDamage}, {diff: true});
    }
}

export function editWeaponDamage(sheet: SheetLike, event: Event): Promise<void> {
    return editScoreField(sheet, event, (n) => ({damage: {score: n}}), "system.damage.score");
}

export function editWeaponStunDamage(sheet: SheetLike, event: Event): Promise<void> {
    return editScoreField(sheet, event, (n) => ({stun: {score: n}}), "system.stun.score");
}

export async function editWeaponFireControl(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const input = event.target as HTMLInputElement;
    const itemId = target.dataset.itemId;
    if (target.dataset.score === "") target.dataset.score = "0";
    const oldDice = od6sutilities.getDiceFromScore(Number(target.dataset.score ?? 0));
    const newScore = rerollScore(input.id, input.value, oldDice, "dice", "pips");

    if (sheet.actor != null) {
        await sheet.actor.updateEmbeddedDocuments("Item",
            [{id: itemId, _id: itemId, "system.fire_control.score": newScore}]);
    } else {
        await sheet.item.update({id: sheet.item.id, "system.fire_control.score": newScore}, {diff: true});
    }
}

export async function editArmor(sheet: SheetLike, event: Event): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    const input = event.target as HTMLInputElement;
    const itemId = target.dataset.itemId;
    const system: {pr?: number; er?: number} = {};
    const oldPrDice = od6sutilities.getDiceFromScore(Number(target.dataset.pr ?? 0));
    const oldErDice = od6sutilities.getDiceFromScore(Number(target.dataset.er ?? 0));
    if (input.id === "prDice") {
        system.pr = od6sutilities.getScoreFromDice(Number(input.value), oldPrDice.pips);
    } else if (input.id === "prPips") {
        system.pr = od6sutilities.getScoreFromDice(oldPrDice.dice, Number(input.value));
    } else if (input.id === "erDice") {
        system.er = od6sutilities.getScoreFromDice(Number(input.value), oldErDice.pips);
    } else if (input.id === "erPips") {
        system.er = od6sutilities.getScoreFromDice(oldErDice.dice, Number(input.value));
    }
    const update = {id: itemId, _id: itemId, system};
    if (sheet.actor != null) {
        await sheet.actor.updateEmbeddedDocuments("Item", [update]);
    } else {
        await sheet.item.update(update);
    }
}
