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
// 2. roll-setup.ts:434–438 — `actor.getFlag('od6s','fatepointeffect')`
//    auto-doubles dice+pips when canUseFp. fate-points permits FP spending
//    for bonuses but doesn't define an "always-on" flag with no cost.  ?
//    confirm whether the flag represents a deferred-cost UI state or a
//    rules-unsanctioned freebie.
//
// 3. roll-setup.ts:153 (approx) — melee range "fudge" derived from token
//    widths and grid size. Pure Foundry grid geometry, not a rules concern;
//    keep as a UI helper but separate from rules math.
//
// 4. roll-setup.ts:547–551 — when `dice_for_scale` is on and `scaleMod < 0`,
//    score is increased by |scaleMod| AND scaleDice is set to a negative
//    dice count. The scale rule defines modifier application to
//    difficulty/damage/resistance but not this combined score-bump +
//    negative-dice substitution.  ?  confirm whether dice_for_scale is a
//    house-rule setting layered on top of the official scale rule.
//
// 5. roll-setup.ts:596–597 — resistance path always converts positive scale
//    to dice unconditionally; attacks (item 4) branch on sign. Asymmetry
//    not justified by scale rule.  ?  same disposition as item 4.
//
// 6. roll-setup.ts:601–603 — `actor.system.roll_mod` is added to score at
//    the very end. No rule defines a flat global per-actor modifier.  ?
//    confirm intent (house-rule slot? debug aid? legacy?).
//
// 7. roll-setup.ts:440–442 — appends localized "Parry" to weapon name when
//    `subtype === 'parry'`, but classifyRoll never produces that subtype.
//    Likely dead code; remove during rewrite.
//
// 8. roll-setup.ts:444 — `canOppose` list includes 'toughness', but no
//    RollTypeKey produces type='toughness'. Either dead, or the list should
//    use 'resistance-vehicletoughness' / canonical 'resistance'. Remove or
//    correct during rewrite.
//
// 9. roll-setup.ts:556–569 — `specSkill` populated only when
//    `OD6S.showSkillSpecialization` setting is true. The specialization
//    rule doesn't gate skill-link visibility on a setting.  ?  confirm
//    whether this is a UI display choice (keep, move to view layer) or
//    rules-relevant (move into the handler input contract).
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
