/**
 * Pure decision logic shared with `roll-preflight.ts`. Lives in its own
 * file so unit tests can import it without dragging in Foundry-coupled
 * modules (ExplosiveDialog etc.) at load time.
 */

import { classifyRoll } from './roll-data';
import type { Localize } from './roll-data';

/**
 * Pure check: does the melee-range gate apply to this incoming roll?
 *
 * The original setupRollData ran the gate after its own subtype normalization
 * (`OD6S.MELEE` → `meleeattack`); preflight runs before that normalization,
 * so we route through `classifyRoll` to get the canonical subtype. Without
 * this, a melee-weapon `item.roll()` (which passes the localized subtype
 * verbatim) would silently bypass the range check.
 */
export function meleeRangeGateApplies(
    data: { type: string; subtype?: string; name?: string },
    localize: Localize,
): boolean {
    const { subtype } = classifyRoll(data, localize);
    return subtype === 'meleeattack' || subtype === 'brawlattack';
}
