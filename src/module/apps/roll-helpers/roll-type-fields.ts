/**
 * Mutation-map contract for #98 (per-roll-type handler decomposition).
 *
 * Partitions {@link RollData}'s fields into:
 *   - {@link COMMON_FIELDS}: finalize sets these uniformly for every roll
 *     type. Handlers MUST NOT diverge from the default for these.
 *   - {@link ROLL_TYPE_FIELDS}[key]: fields the handler for `key` is allowed
 *     to populate in its partial output. The union across all keys plus
 *     COMMON_FIELDS must equal `keyof RollData` (asserted by the test).
 *
 * The cross-cutting risk the #98 issue calls out (bonusmod / miscMod /
 * damageScore are written by multiple type-specific paths and folded into
 * common-derived fields like bonusdice) shows up here as fields appearing
 * in multiple ROLL_TYPE_FIELDS buckets — that overlap is the type-specific
 * contribution. The fold itself (bonusmod → bonusdice/bonuspips) happens
 * in finalize, so bonusdice/bonuspips are COMMON even though every attack
 * handler contributes a bonusmod increment that feeds them.
 *
 * No Foundry globals; pure data + types.
 */

import type { RollData, RollTypeKey } from './roll-data';

/**
 * Fields finalize sets uniformly. A field belongs here iff *no* handler
 * needs to override its default — finalize fills it from input data,
 * actor state, settings, or by folding handler-contributed intermediates.
 */
export const COMMON_FIELDS: readonly (keyof RollData)[] = [
    // Identity / labels
    'label', 'title',
    // Roll dice/pips — derived in finalize from score (handler may override
    // score, but the score→dice conversion is uniform).
    'dice', 'pips', 'originaldice', 'originalpips',
    // Bonus dice — derived in finalize from accumulated bonusmod.
    'bonusdice', 'bonuspips',
    // Wild die — setting + actor flag, no handler diverges.
    'wilddie', 'showWildDie',
    // Fate-point / character-point ledger — finalize-managed.
    'fatepoint', 'fatepointeffect', 'characterpoints',
    'contact', 'cpcost', 'cpcostcolor',
    // CP/FP eligibility — flipped to false by funds/purchase/vehicletoughness
    // policies in finalize keyed off the canonical type, not by handlers.
    'canusefp', 'canusecp',
    // Visibility — every roll type sets this from a setting key. The mapping
    // is a finalize policy keyed by RollTypeKey, not handler output.
    'isvisible', 'isknown',
    // Explosive flag — derived from item flag at top of setup, before dispatch.
    'isExplosive',
    // Canonical type/subtype — produced by classifyRoll, not handlers.
    'type', 'subtype',
    // Actor / token — input.
    'actor', 'token',
    // Penalty bundle — derived in finalize via computePenalties + splitBonus.
    'actionpenalty', 'woundpenalty', 'stunnedpenalty', 'otherpenalty',
    // Combat shot/defense ledger — finalize defaults.
    'multishot', 'shots', 'fulldefense', 'timer',
    // Item / target plumbing — input.
    'itemid', 'targets', 'target',
    // Difficulty number — input (handler may set difficultylevel string but
    // not the number).
    'difficulty',
    // Opposability — derived from canonical type/subtype in finalize.
    'isoppasable',
    // Vehicle UI defaults — literal in finalize.
    'vehiclespeed', 'vehiclecollisiontype', 'vehicleterraindifficulty',
    // Template path — literal.
    'template',
    // Modifiers subobject — finalize assembles from miscMod/scaleMod/range.
    'modifiers',
    // Roll mode — set later by execute path, optional.
    'rollmode',
];

/**
 * Per-handler field ownership. Each handler may populate the listed fields
 * in its partial output; finalize fills the rest from {@link COMMON_FIELDS}.
 *
 * Overlap between buckets is intentional and meaningful — it documents the
 * cross-cutting fields that multiple type-specific paths contribute to.
 */
export const ROLL_TYPE_FIELDS: Record<RollTypeKey, readonly (keyof RollData)[]> = {
    // ---- Direct weapon rolls (hand-held, vehicle-mounted, starship-mounted) ----
    'weapon': [
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
        'damagemodifiers', 'source', 'range', 'difficultylevel',
        'only_stun', 'can_stun', 'stun', 'attackerScale', 'specSkill',
    ],
    'starship-weapon': [
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
        'damagemodifiers', 'source', 'range', 'difficultylevel',
        'only_stun', 'can_stun', 'stun', 'attackerScale', 'specSkill',
    ],
    'vehicle-weapon': [
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
        'damagemodifiers', 'source', 'range', 'difficultylevel',
        'only_stun', 'can_stun', 'stun', 'attackerScale', 'specSkill',
        'vehicle',
    ],

    // ---- Action rolls (skill-backed combat actions) ----
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

    // ---- Skill / specialization rolls ----
    'skill': ['attribute'],
    'skill-dodge': ['attribute'],
    'specialization': ['attribute', 'specSkill'],

    // ---- Damage / resistance / wound / status rolls ----
    'damage': [],
    'resistance': ['scaledice'],
    'resistance-vehicletoughness': ['scaledice', 'vehicle'],
    'mortally_wounded': [],
    'incapacitated': [],

    // ---- Economy ----
    'funds': [],
    'purchase': ['seller'],

    // ---- Top-level brawl (sheet button shortcut) ----
    'brawlattack': [
        'damagetype', 'damagescore', 'stundamagetype', 'stundamagescore',
        'can_stun', 'attackerScale',
    ],
};
