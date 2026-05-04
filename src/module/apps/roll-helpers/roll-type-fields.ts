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
    // canusefp/cp diverge in vehicletoughness paths (always false) and in
    // funds/purchase paths (false only when OD6S.fundsFate is off, otherwise
    // true). Both are finalize policies keyed by canonical type and the
    // funds_fate setting, not handler output.
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

    // Top-level attribute roll (Actor.rollAttribute). Flows through
    // setupRollData with no type-specific writes; score/dice come from input.
    'attribute': [],
} as const satisfies Record<RollTypeKey, readonly (keyof RollData)[]>;

// ---- Phase 0 (#98): RollTypeKey → governing rule ids ----
//
// Maps each handler key to the rule ids in the (gitignored) rules reference
// that govern its behavior. Rule ids only — no rule text. The mapping is the
// design spec the upcoming handlers (and their domain tests) are written
// against; if a handler ends up needing logic not covered by the listed
// rules, the discrepancy is the signal to either extend this map or remove
// the unbacked behavior.
//
// `?` after an id = best-guess assignment, needs user confirmation before
// Phase 1 tests rely on it.
//
// weapon                            : attacking-and-defending, base-combat-difficulty,
//                                     combat-difficulty-modifiers-range, step-3-determining-damage,
//                                     determining-strength-damage
// starship-weapon                   : scale, step-3-determining-damage, combat-difficulty-modifiers-range,
//                                     ship-weapons
// vehicle-weapon                    : scale, step-3-determining-damage, combat-difficulty-modifiers-range,
//                                     vehicle-damage
// action-meleeattack                : attacking-and-defending, combat-difficulty-modifiers-range,
//                                     skill-base-mechanics
// action-brawlattack                : attacking-and-defending, step-3-determining-damage,
//                                     determining-strength-damage
// action-rangedattack               : attacking-and-defending, combat-difficulty-modifiers-range,
//                                     combat-difficulty-modifiers-cover, base-combat-difficulty
// action-vehiclerangedattack        : scale, combat-difficulty-modifiers-range, vehicle-damage
// action-vehiclerangedweaponattack  : scale, step-3-determining-damage, combat-difficulty-modifiers-range
// action-vehicleramattack           : ramming, scale, vehicle-damage, step-3-determining-damage
// action-attribute                  : skill-check, base-combat-difficulty
// action-other                      : skill-check, base-combat-difficulty  ?  fallback bucket — verify
//                                     no current caller depends on action-other doing anything
//                                     beyond a generic skill-check
// skill                             : skill-base-mechanics, skill-check
// skill-dodge                       : attacking-and-defending, active-defense, skill-base-mechanics
// specialization                    : specialization-in-skills, skill-check
// damage                            : step-3-determining-damage, body-points-damage-application
// resistance                        : damage-resistance-total-body-points,
//                                     damage-resistance-total-wound-levels
// resistance-vehicletoughness       : scale, damage-resistance-total-body-points, vehicle-damage
// mortally_wounded                  : unconsciousness-and-death, wound-level-effects
// incapacitated                     : wound-level-effects  ?  largely UI/state — confirm whether the
//                                     roll itself has a rules basis or is purely a status check
// funds                             : funds-determination, equipment-purchase-mechanics
// purchase                          : funds-determination, equipment-purchase-mechanics
// brawlattack                       : attacking-and-defending, step-3-determining-damage,
//                                     determining-strength-damage  ?  legacy top-level alias of
//                                     action-brawlattack — candidate for removal if no caller routes here
// attribute                         : skill-check, attribute-dice-distribution
//
// ---- Behaviors in roll-setup.ts with no apparent rules backing ----
//
// Each entry is a candidate for removal during the rewrite. `?` = confirm
// with user before deletion. References use ids defined above.
//
// 1. roll-setup.ts:451 — `miscMod += 5` is added when action.subtype is
//    'meleeattack' AND the localized name matches OD6S.ACTION_MELEE_ATTACK.
//    Hardcoded +5 with no entry in attacking-and-defending or
//    combat-difficulty-modifiers-range.  ?  confirm — looks like a fudge
//    distinguishing "generic action menu melee" from "weapon item melee".
//
// 2. roll-setup.ts:434–438 — `fatepointeffect` flag doubling.
//    RECLASSIFIED 2026-05-04 as rules-backed: the FP is paid for in
//    roll-execute.ts when first spent (`rollData.fatepoint`); the flag
//    keeps the "FP in effect for the round" state so subsequent rolls in
//    the round are doubled without re-paying. Cleared on round advance
//    (combat-hooks). Matches the fate-points rule's full-round duration.
//    Phase 1 should pin the bonusmod-compounding edge case in a unit test
//    (execute doubles originaldice/pips, setup doubles dice/pips).
//
// 3. roll-setup.ts:150–160 — melee/brawl out-of-range check (gated on
//    `OD6S.meleeRange`). Token-width "fudge" is grid-geometry correction
//    so size-disparate tokens aren't false-positives. RECLASSIFIED: not a
//    rules concern at all — Foundry-VTT UX validation. Phase 3 should
//    relocate this to a pre-roll sheet/action listener so the rules
//    pipeline doesn't carry canvas/UI logic.
//
// 4. roll-setup.ts:547–551 — `dice_for_scale` + negative-scale combined
//    score-bump and negative scaleDice. RECLASSIFIED 2026-05-04 as
//    rules-backed: the score-bump is the additive scale modifier (scale
//    rule); the negative scaleDice is fed into otherpenalty in
//    roll-execute.ts:61 — the dice-pool reduction equivalent. The
//    `dice_for_scale` setting selects between two equivalent
//    presentations of the same rule, not an unbacked layer.
//
// 5. roll-setup.ts:596–597 — resistance path scaleDice always-positive.
//    RECLASSIFIED 2026-05-04 as rules-backed: not asymmetric — items 4
//    and 5 are the attacker-side and defender-side halves of the same
//    scale rule. Attacker-smaller subtracts from attacker score
//    (item 4); defender-larger adds to defender dice (item 5). Same
//    rule, role-split application.
//
// 6. roll-setup.ts:601–603 — `actor.system.roll_mod` flat additive.
//    RECLASSIFIED 2026-05-04 as not-a-rules-concern: it's a per-actor
//    GM/admin override field declared in actor schemas (initial 0), used
//    in init-roll.ts as well. Keep — but document as a configurable
//    knob outside the core rule set; the rules pipeline shouldn't
//    "delete" it. Phase 3 may move the application out of setupRollData
//    if cleaner, but it's not a deletion candidate.
//
// 7. roll-setup.ts:440–442 — "Parry" weapon-name suffix.
//    RECLASSIFIED 2026-05-04 as rules-backed (and not dead): item.ts
//    sets `subtype = 'parry'` directly when a weapon is rolled as parry
//    defense, bypassing classifyRoll. roll-difficulty.ts and roll-execute
//    both rely on the value. The label suffix is the user-facing marker
//    of the defensive use. Keep.
//
// 8. roll-setup.ts:444 — `'toughness'` in canOppose list. CONFIRMED dead:
//    no RollTypeKey or canonical type ever produces `type: 'toughness'`
//    (vehicletoughness is normalized to resistance). Zero-impact deletion
//    in rewrite — no RFC.
//
// 9. roll-setup.ts:556–569 — `specSkill` gated on `showSkillSpecialization`
//    setting. RECLASSIFIED 2026-05-04 as not-a-rules-concern: the rule
//    governs *when* a specialization applies, not *whether* the dialog
//    shows the backing skill link. The setting is a UI presentation
//    preference. Keep; phase 3 may move the read into the dialog/view
//    layer instead of the handler contract.
//
// ---- Net Phase 0 outcome ----
// Of 9 originally-flagged behaviors:
//   - 1 RFC filed (#100) — item 1 (+5 magic constant)
//   - 1 dead string to delete in rewrite (item 8) — zero impact
//   - 4 reclassified rules-backed (items 2, 4, 5, 7)
//   - 3 reclassified not-a-rules-concern, keep / relocate (items 3, 6, 9)
//
// Phase 1 (domain tests) can proceed without further user gating.
//
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
