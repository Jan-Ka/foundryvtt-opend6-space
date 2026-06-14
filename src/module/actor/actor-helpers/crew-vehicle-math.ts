/**
 * Pure helpers for the crew/vehicle synchronization flows in
 * `crew-vehicle.ts`. Everything here takes plain data and returns plain data
 * so it can be exercised in `tests/domain/` without a Foundry runtime.
 *
 * The orchestrator (`crew-vehicle.ts`) keeps the document mutations and
 * socket dispatch; this file only houses the decision logic.
 */

/** Subset of an Actor's crewmember entry needed by the math layer. */
export interface CrewMemberRef {
    uuid: string;
    name?: string;
}

/** Subset of an Item shape needed to project a vehicle weapon snapshot. */
export interface ItemLike {
    id: string;
    type: string;
    toObject(): Record<string, unknown> & { id?: string };
}

/**
 * Predicate matching the runtime behaviour of `actor.getFlag('nonex-ist-od6s', 'crew')`
 * — a crewmember is identified by holding a non-empty crew flag pointing at
 * a vehicle uuid.
 */
export function isCrewMemberByFlag(crewFlag: string | null | undefined): boolean {
    return typeof crewFlag === 'string' && crewFlag !== '';
}

/**
 * Decide whether `removeFromCrew` should proceed. The runtime emits a
 * `NONEX_IST_OD6S.NOT_CREW_MEMBER` warning when the caller's crew flag doesn't match
 * the target vehicle id; this predicate captures that gate without the
 * notification side effect.
 */
export function canRemoveFromCrew(
    currentCrewFlag: string | null | undefined,
    targetVehicleUuid: string,
): boolean {
    return currentCrewFlag === targetVehicleUuid;
}

/**
 * Drop a crewmember by uuid, preserving the order of the remaining entries.
 * Mirrors the filter in `forceRemoveCrewmember`.
 */
export function removeCrewmember(
    crew: readonly CrewMemberRef[],
    uuid: string,
): CrewMemberRef[] {
    return crew.filter((c) => c.uuid !== uuid);
}

/**
 * Project a list of items to the vehicle-weapon snapshot array stored on
 * crewmember actors' `system.vehicle.vehicle_weapons`. Filters to the two
 * weapon types and stamps each entry's `id` so consumers (sheet-rolls,
 * roll-setup) can locate the source item back on the vehicle.
 */
export function buildVehicleWeaponSnapshots(
    items: readonly ItemLike[],
): Array<Record<string, unknown> & { id: string }> {
    const out: Array<Record<string, unknown> & { id: string }> = [];
    for (const item of items) {
        if (item.type !== 'vehicle-weapon' && item.type !== 'starship-weapon') continue;
        const snapshot = item.toObject();
        snapshot.id = item.id;
        out.push(snapshot as Record<string, unknown> & { id: string });
    }
    return out;
}

/**
 * Decide whether a `sendVehicleData` call should run locally or be dispatched
 * to the GM client via socketlib. The runtime check is a single
 * `game.user.isGM` boolean; threading it through a pure helper keeps the
 * branching testable.
 */
export function shouldDispatchVehicleDataAsGM(isGM: boolean): boolean {
    return !isGM;
}

/**
 * Filter the crewmember list down to a single uuid (or pass through
 * unchanged when no uuid is supplied). Mirrors the inline branch in
 * `sendVehicleData` that decides whether to push to one crewmember or to
 * the whole list.
 */
export function selectCrewmembersForBroadcast(
    crew: readonly CrewMemberRef[],
    targetUuid: string | undefined,
): CrewMemberRef[] {
    if (typeof targetUuid === 'undefined') return [...crew];
    return crew.filter((c) => c.uuid === targetUuid);
}
