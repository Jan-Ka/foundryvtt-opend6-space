/**
 * Domain tests: crew/vehicle synchronization helpers (#84).
 *
 * These exercise the pure decision logic extracted from
 * `src/module/actor/actor-helpers/crew-vehicle.ts` into
 * `crew-vehicle-math.ts`. The orchestrator still owns the document
 * mutations and socket dispatch; this file covers what runs around them.
 *
 * Multiplayer edge cases worth pinning:
 *   - empty / null / placeholder crew flags (don't claim crew membership).
 *   - mismatched vehicle uuid on remove (the runtime warns instead of
 *     silently unsetting another vehicle's flag).
 *   - duplicate / missing crewmember uuids in the vehicle's roster.
 *   - mixed-type item rosters (only vehicle/starship weapons should be
 *     projected into the snapshot).
 *   - GM-vs-player branching for `sendVehicleData` dispatch.
 */

import { describe, it, expect } from 'vitest';
import {
    isCrewMemberByFlag,
    canRemoveFromCrew,
    removeCrewmember,
    buildVehicleWeaponSnapshots,
    shouldDispatchVehicleDataAsGM,
    selectCrewmembersForBroadcast,
    type CrewMemberRef,
    type ItemLike,
} from '../../src/module/actor/actor-helpers/crew-vehicle-math';

// ---------------------------------------------------------------------------
// isCrewMemberByFlag
// ---------------------------------------------------------------------------

describe('isCrewMemberByFlag', () => {
    it('non-empty uuid string → true', () => {
        expect(isCrewMemberByFlag('Actor.abc123')).toBe(true);
    });

    it('empty string → false', () => {
        expect(isCrewMemberByFlag('')).toBe(false);
    });

    it('undefined → false', () => {
        expect(isCrewMemberByFlag(undefined)).toBe(false);
    });

    it('null → false (Foundry returns null for missing flags)', () => {
        expect(isCrewMemberByFlag(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// canRemoveFromCrew
// ---------------------------------------------------------------------------

describe('canRemoveFromCrew', () => {
    it('matching vehicle uuid → true', () => {
        expect(canRemoveFromCrew('Actor.vehicle1', 'Actor.vehicle1')).toBe(true);
    });

    it('different vehicle uuid → false (runtime warns NOT_CREW_MEMBER)', () => {
        expect(canRemoveFromCrew('Actor.vehicle1', 'Actor.vehicle2')).toBe(false);
    });

    it('actor not on any crew → false', () => {
        expect(canRemoveFromCrew(null, 'Actor.vehicle1')).toBe(false);
    });

    it('empty crew flag, target uuid present → false', () => {
        expect(canRemoveFromCrew('', 'Actor.vehicle1')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// removeCrewmember
// ---------------------------------------------------------------------------

describe('removeCrewmember', () => {
    const roster: CrewMemberRef[] = [
        { uuid: 'Actor.alice', name: 'Alice' },
        { uuid: 'Actor.bob', name: 'Bob' },
        { uuid: 'Actor.carol', name: 'Carol' },
    ];

    it('removes the matching uuid and preserves order', () => {
        const out = removeCrewmember(roster, 'Actor.bob');
        expect(out).toEqual([
            { uuid: 'Actor.alice', name: 'Alice' },
            { uuid: 'Actor.carol', name: 'Carol' },
        ]);
    });

    it('uuid not present → returns a copy unchanged', () => {
        const out = removeCrewmember(roster, 'Actor.dave');
        expect(out).toEqual(roster);
    });

    it('empty roster → empty roster', () => {
        expect(removeCrewmember([], 'Actor.alice')).toEqual([]);
    });

    it('duplicate uuids → all copies removed (defensive against bad sync state)', () => {
        const dup: CrewMemberRef[] = [
            { uuid: 'Actor.alice' },
            { uuid: 'Actor.alice' },
            { uuid: 'Actor.bob' },
        ];
        expect(removeCrewmember(dup, 'Actor.alice')).toEqual([{ uuid: 'Actor.bob' }]);
    });

    it('does not mutate the input list', () => {
        const before = roster.slice();
        removeCrewmember(roster, 'Actor.bob');
        expect(roster).toEqual(before);
    });
});

// ---------------------------------------------------------------------------
// buildVehicleWeaponSnapshots
// ---------------------------------------------------------------------------

function fakeItem(id: string, type: string, extras: Record<string, unknown> = {}): ItemLike {
    return {
        id,
        type,
        toObject: () => ({ _id: id, type, name: `${type} ${id}`, ...extras }),
    };
}

describe('buildVehicleWeaponSnapshots', () => {
    it('keeps only vehicle-weapon and starship-weapon items', () => {
        const items: ItemLike[] = [
            fakeItem('a', 'weapon'),
            fakeItem('b', 'vehicle-weapon'),
            fakeItem('c', 'gear'),
            fakeItem('d', 'starship-weapon'),
            fakeItem('e', 'skill'),
        ];
        const out = buildVehicleWeaponSnapshots(items);
        expect(out.map((s) => s.id)).toEqual(['b', 'd']);
    });

    it('stamps `id` on each snapshot (downstream lookups rely on it)', () => {
        const items: ItemLike[] = [fakeItem('vw1', 'vehicle-weapon')];
        const [snapshot] = buildVehicleWeaponSnapshots(items);
        expect(snapshot.id).toBe('vw1');
    });

    it('preserves snapshot data fields from toObject()', () => {
        const items: ItemLike[] = [fakeItem('vw1', 'vehicle-weapon', { system: { damage: { score: 5 } } })];
        const [snapshot] = buildVehicleWeaponSnapshots(items);
        expect(snapshot.system).toEqual({ damage: { score: 5 } });
    });

    it('empty input → empty output', () => {
        expect(buildVehicleWeaponSnapshots([])).toEqual([]);
    });

    it('all-non-weapon roster → empty output', () => {
        const items: ItemLike[] = [fakeItem('a', 'gear'), fakeItem('b', 'skill')];
        expect(buildVehicleWeaponSnapshots(items)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// shouldDispatchVehicleDataAsGM
// ---------------------------------------------------------------------------

describe('shouldDispatchVehicleDataAsGM', () => {
    it('GM client runs locally → no dispatch', () => {
        expect(shouldDispatchVehicleDataAsGM(true)).toBe(false);
    });

    it('player client must defer to GM via socket → dispatch', () => {
        expect(shouldDispatchVehicleDataAsGM(false)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// selectCrewmembersForBroadcast
// ---------------------------------------------------------------------------

describe('selectCrewmembersForBroadcast', () => {
    const roster: CrewMemberRef[] = [
        { uuid: 'Actor.alice' },
        { uuid: 'Actor.bob' },
        { uuid: 'Actor.carol' },
    ];

    it('no targetUuid → broadcast to entire roster', () => {
        expect(selectCrewmembersForBroadcast(roster, undefined)).toEqual(roster);
    });

    it('targetUuid present → narrows to that crewmember', () => {
        expect(selectCrewmembersForBroadcast(roster, 'Actor.bob')).toEqual([{ uuid: 'Actor.bob' }]);
    });

    it('targetUuid not in roster → empty list (no broadcast)', () => {
        expect(selectCrewmembersForBroadcast(roster, 'Actor.dave')).toEqual([]);
    });

    it('returns a fresh array even when broadcasting all (no aliasing)', () => {
        const out = selectCrewmembersForBroadcast(roster, undefined);
        expect(out).not.toBe(roster);
    });
});
