/**
 * Preflight cancellation gates for the roll pipeline.
 *
 * `runPreflight` returns `false` when one of the gates wants to cancel the
 * roll (matching `setupRollData`'s "return false" semantics). The gates:
 *
 *   1. Explosive setup — when the item is an explosive and its `explosiveSet`
 *      flag isn't yet set, open the explosive dialog and cancel the current
 *      roll. The dialog re-fires the roll once the user picks options.
 *   2. Sheet mode — when the actor's sheet is in a non-normal mode (build/
 *      edit), warn and cancel.
 *   3. Out-of-range melee / brawl — when the attacker is too far from the
 *      target (per the meleeRange setting and a token-size grid fudge),
 *      warn and cancel.
 *
 * All three are Foundry-coupled by design (dialogs, canvas geometry,
 * notifications) — they belong to the orchestrator boundary, not the rules
 * pipeline. Handlers never see preflight; if preflight cancels, dispatch
 * never runs.
 */

import OD6S from "../../config/config-od6s";
import ExplosiveDialog from "../explosive-dialog";

/**
 * Run the three cancellation gates in order. Returns `true` to proceed,
 * `false` to cancel (caller short-circuits like the original setupRollData
 * `return false`).
 */
export async function runPreflight(data: IncomingRollData): Promise<boolean> {
    if (!(await passesExplosiveGate(data))) return false;
    if (!passesSheetModeGate(data)) return false;
    if (!passesMeleeRangeGate(data)) return false;
    return true;
}

async function passesExplosiveGate(data: IncomingRollData): Promise<boolean> {
    if (typeof data.itemId === 'undefined' || data.itemId === '') return true;

    let item = data.actor.items.get(data.itemId);
    if (typeof item === 'undefined'
        && data.type === 'action'
        && data.subtype === 'vehiclerangedweaponattack') {
        item = (data.actor.system as OD6SCharacterSystem).vehicle.vehicle_weapons!
            .find((i: any) => i.id === data.itemId);
    }

    const sys = item?.system as OD6SWeaponItemSystem | undefined;
    if (sys?.subtype?.toLowerCase() !== 'explosive') return true;
    if (item!.getFlag('od6s', 'explosiveSet')) return true;

    await new ExplosiveDialog({
        options: OD6S.explosives,
        item: item!,
        actor: data.actor,
        type: 'OD6S.EXPLOSIVE_THROWN',
        auto: game.settings.get('od6s', 'auto_explosive'),
    } as never).render({force: true});
    return false;
}

function passesSheetModeGate(data: IncomingRollData): boolean {
    if (data.actor.system.sheetmode.value === "normal") return true;
    ui.notifications.warn(game.i18n.localize("OD6S.WARN_SHEET_MODE_NOT_NORMAL"));
    return false;
}

function passesMeleeRangeGate(data: IncomingRollData): boolean {
    if (data.subtype !== 'meleeattack' && data.subtype !== 'brawlattack') return true;
    if (!OD6S.meleeRange) return true;
    const targets = [...(game.user?.targets ?? [])];
    if (targets.length === 0) return true;

    const actorToken = data.actor.getActiveTokens()[0];
    const fudge = Math.floor((((actorToken.width + targets[0].width) / canvas.grid.size) * 0.5) - 1);
    const distance = Math.floor(
        canvas.grid.measurePath([actorToken.center, targets[0].center]).distance,
    ) - fudge;

    if (distance !== 0 && distance / canvas.grid.distance > 1.5) {
        ui.notifications.warn(game.i18n.localize('OD6S.OUT_OF_MELEE_BRAWL_RANGE'));
        return false;
    }
    return true;
}

// Local type aliases — kept narrow to avoid leaking Foundry-typed surface
// out of this file.
type IncomingRollData = import('./roll-data').IncomingRollData;
