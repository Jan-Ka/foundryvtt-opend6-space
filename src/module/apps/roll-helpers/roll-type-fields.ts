/**
 * Mutation-map contract for #98 (per-roll-type handler decomposition).
 *
 * Partitions {@link RollData}'s fields into:
 *   - {@link COMMON_FIELDS}: finalize sets these uniformly for every roll
 *     type. Handlers MUST NOT diverge from the default for these.
 *   - {@link ROLL_TYPE_FIELDS}[key]: fields the handler for `key` is allowed
 *     to populate in its partial output.
 *
 * Partition invariants (totality, no overlap) are checked at compile time
 * via the `_assert*` types below — bad declarations fail to type-check
 * before any runtime test runs.
 *
 * The cross-cutting risk #98 calls out (bonusmod / miscMod / damageScore are
 * written by multiple type-specific paths and folded into common-derived
 * fields like bonusdice) shows up here as fields appearing in multiple
 * ROLL_TYPE_FIELDS buckets — that overlap is the type-specific contribution.
 * The fold itself happens in finalize, so bonusdice/bonuspips are COMMON
 * even though every attack handler contributes a bonusmod increment.
 *
 * No Foundry globals; pure data + types.
 */

import type { RollData, RollTypeKey } from './roll-data';

export const COMMON_FIELDS = [
    'label', 'title',
    'dice', 'pips', 'originaldice', 'originalpips',
    'bonusdice', 'bonuspips',
    'wilddie', 'showWildDie',
    'fatepoint', 'fatepointeffect', 'characterpoints',
    'contact', 'cpcost', 'cpcostcolor',
    // canusefp/cp diverge in funds/purchase/vehicletoughness, but always to
    // the same value (false) — that's a finalize policy keyed by canonical
    // type, not handler output.
    'canusefp', 'canusecp',
    // Visibility maps from RollTypeKey to a setting key in finalize, not
    // handler output.
    'isvisible', 'isknown',
    // Derived from item flag at top of setup, before dispatch.
    'isExplosive',
    // Produced by classifyRoll, not handlers.
    'type', 'subtype',
    'actor', 'token',
    // Derived in finalize via computePenalties + splitBonusForPenalty.
    'actionpenalty', 'woundpenalty', 'stunnedpenalty', 'otherpenalty',
    'multishot', 'shots', 'fulldefense', 'timer',
    'itemid', 'targets', 'target',
    // Number — handlers may set difficultylevel string but not the number.
    'difficulty',
    // Derived from canonical type/subtype in finalize.
    'isoppasable',
    'vehiclespeed', 'vehiclecollisiontype', 'vehicleterraindifficulty',
    'template',
    // Finalize assembles from miscMod/scaleMod/range intermediates.
    'modifiers',
    // Set by execute path, not setup.
    'rollmode',
] as const satisfies readonly (keyof RollData)[];

const WEAPON_BUCKET = [
    'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
    'damagemodifiers', 'source', 'range', 'difficultylevel',
    'only_stun', 'can_stun', 'stun', 'attackerScale', 'specSkill',
] as const satisfies readonly (keyof RollData)[];

export const ROLL_TYPE_FIELDS = {
    'weapon': WEAPON_BUCKET,
    'starship-weapon': WEAPON_BUCKET,
    'vehicle-weapon': [...WEAPON_BUCKET, 'vehicle'],

    'action-meleeattack': ['score', 'attackerScale', 'damagescore'],
    'action-brawlattack': [
        'score', 'attackerScale',
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore', 'can_stun',
    ],
    'action-rangedattack': ['score', 'range', 'difficultylevel', 'attackerScale'],
    'action-vehiclerangedattack': [
        'score', 'range', 'difficultylevel', 'attackerScale', 'vehicle',
    ],
    'action-vehiclerangedweaponattack': [
        'damagetype', 'damagescore', 'source',
        'range', 'difficultylevel', 'attackerScale', 'vehicle',
    ],
    'action-vehicleramattack': [
        'damagetype', 'damagemodifiers', 'source', 'attackerScale', 'vehicle',
    ],
    'action-attribute': ['score'],
    'action-other': [],

    'skill': ['attribute'],
    'skill-dodge': ['attribute'],
    'specialization': ['attribute', 'specSkill'],

    'damage': [],
    'resistance': ['scaledice'],
    'resistance-vehicletoughness': ['scaledice', 'vehicle'],
    'mortally_wounded': [],
    'incapacitated': [],

    'funds': [],
    'purchase': ['seller'],

    'brawlattack': [
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
        'can_stun', 'attackerScale',
    ],
} as const satisfies Record<RollTypeKey, readonly (keyof RollData)[]>;

// ---- Compile-time partition invariants ----
//
// These types resolve to `never` iff the partition is well-formed; if any
// invariant is violated, the corresponding `_assert*` constant fails to
// type-check with the offending field name in the error.

type AnyHandlerField = (typeof ROLL_TYPE_FIELDS)[RollTypeKey][number];
type AnyCommonField = (typeof COMMON_FIELDS)[number];

/** Fields in RollData not covered by COMMON_FIELDS or any handler bucket. */
type _MissingFromPartition = Exclude<keyof RollData, AnyCommonField | AnyHandlerField>;

/** Fields listed in the partition that aren't actually keyof RollData. (Should be never since `satisfies` already constrains.) */
type _ExtraInPartition = Exclude<AnyCommonField | AnyHandlerField, keyof RollData>;

/** Fields appearing in BOTH COMMON_FIELDS and a handler bucket — strict-partition violation. */
type _CommonHandlerOverlap = Extract<AnyCommonField, AnyHandlerField>;

const _assertNoMissing: [_MissingFromPartition] extends [never] ? true : never = true;
const _assertNoExtra: [_ExtraInPartition] extends [never] ? true : never = true;
const _assertNoOverlap: [_CommonHandlerOverlap] extends [never] ? true : never = true;
void _assertNoMissing; void _assertNoExtra; void _assertNoOverlap;
