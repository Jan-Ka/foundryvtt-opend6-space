/**
 * COMMON-side assembly: combines a handler's typed bucket with precomputed
 * COMMON inputs into a complete {@link RollData} object.
 *
 * Finalize is the assembler, not the computer. The orchestrator (in
 * `setupRollData`) does the Foundry-coupled work — reading active effects,
 * resolving the score after roll_mod / flat-skills, computing visibility
 * from settings, etc. — and hands those values in. Finalize only:
 *
 *   - Composes the existing pure helpers ({@link computePenalties},
 *     {@link getDiceFromScore})
 *   - Derives type-driven flags (isOppasable from canonical type)
 *   - Slots stable defaults (multishot=false, shots=1, vehiclespeed='cruise', …)
 *   - Builds the modifiers sub-object
 *   - Passes through opaque Foundry refs (actor, token, targets)
 *
 * Foundry types appear only as opaque pass-through fields on {@link RollData}.
 * Finalize itself doesn't read them, so it stays unit-testable with plain
 * placeholder objects.
 */

import type { ClassifiedRoll, RollData } from './roll-data';
import type { HandlerOutput } from './roll-handlers';
import type { RollTypeKey } from './roll-data';
import type { Penalties } from './action-math';
import { getDiceFromScore } from '../../system/utilities/dice';

/**
 * Roll types whose roll is opposable (defender can roll back). Mirrors the
 * canOppose list in the legacy setupRollData; the dead `'toughness'` entry
 * is gone (no canonical type produces it — see PR #101 phase 0 audit).
 */
const OPPOSABLE_TYPES: ReadonlySet<string> = new Set([
    'skill', 'attribute', 'specialization', 'damage', 'resistance',
]);

/**
 * Inputs the orchestrator hands to {@link runFinalize}. Most are precomputed
 * COMMON values; `bucket` is the typed handler output.
 */
export interface FinalizeInput<K extends RollTypeKey> {
    classified: ClassifiedRoll;
    /** Final roll score after every COMMON adjustment (roll_mod, flat-skills, etc.). */
    score: number;
    /** Display name of the roll (already includes the parry suffix when applicable). */
    name: string;
    /** Item id, when the roll has an item; empty string otherwise. */
    itemId: string;
    /** Difficulty number when known (input-supplied). */
    difficulty: number;
    /** Pre-set difficulty label (input-supplied or settings default). */
    difficultyLevel: string;
    /** True when the explosive preflight detected this is an explosive item. */
    isExplosive: boolean;
    /** True when the roll's chat card should be visible to non-GM observers. */
    isVisible: boolean;
    /** True when the FP-in-effect-for-the-round flag is set on the actor. */
    fatepointEffect: boolean;
    /** Whether the roll is allowed to spend FP / CP (gated by type + setting). */
    canUseFp: boolean;
    canUseCp: boolean;
    /** True when the world's wild-die system is on AND the actor opts in. */
    wildDie: boolean;
    /** True when the world's wild-die system is on (regardless of actor opt-in). */
    showWildDie: boolean;
    /** Penalty inputs precomputed by the orchestrator (count, stuns, woundPenalty). */
    penalties: Penalties;
    /** Extra penalty (from negative scaleMod under dice_for_scale, etc.). */
    otherPenalty: number;
    /**
     * Pre-split bonus dice / pips. Orchestrator computes via
     * `splitBonusForPenalty` (negative bonus folds into `otherPenalty`) and
     * augments `bonusPips` with `flatSkillBonusPips` in flat-skills mode.
     * Finalize is a passive forwarder for these.
     */
    bonusDice: number;
    bonusPips: number;
    /** Misc modifier (weapon mods difficulty, +5 magic constants if any, etc.). */
    miscMod: number;
    /** Scale modifier between attacker and defender (post-resolution). */
    scaleMod: number;
    /** Resolved range label (after distance bucketing). */
    range: string;
    /** Vehicle terrain difficulty label (when vehicleDifficulty setting is on). */
    vehicleTerrainDifficulty: string;
    /** Pips per die (3 in standard OpenD6). */
    pipsPerDice: number;
    /**
     * Post-conversion dice multiplier (default 1). When the FP-in-effect flag
     * doubles the roll, orchestrator passes `2`; finalize multiplies BOTH
     * `dice` and `pips` AND the matching `originaldice`/`originalpips` after
     * `score → dice/pips` conversion. This keeps `originaldice` aligned with
     * the doubled values execute also re-doubles from on its FP path.
     *
     * Splitting score-derived dice from the multiplier closes the Audit-A
     * timeline bug where damaged-weapon penalties / `roll_mod` re-derives
     * could overwrite an earlier doubling.
     */
    diceMultiplier?: number;
    /** Opaque Foundry actor/token/targets refs — passed through unchanged. */
    actorRef: unknown;
    tokenRef: unknown;
    targetsRef: unknown[];
    targetRef?: unknown;
    /** Output of HANDLERS[classified.key]. */
    bucket: HandlerOutput<K>;
}

export function runFinalize<K extends RollTypeKey>(input: FinalizeInput<K>): RollData {
    const baseDice = getDiceFromScore(input.score, input.pipsPerDice);
    const multiplier = input.diceMultiplier ?? 1;
    const dicePips = {
        dice: baseDice.dice * multiplier,
        pips: baseDice.pips * multiplier,
    };

    const isOppasable =
        OPPOSABLE_TYPES.has(input.classified.type)
        || (input.classified.type === 'action' && OPPOSABLE_TYPES.has(input.classified.subtype));

    return {
        // Labels (orchestrator already resolved with parry suffix etc.)
        label: input.name,
        title: input.name,

        // Dice / pips
        dice: dicePips.dice,
        pips: dicePips.pips,
        originaldice: dicePips.dice,
        originalpips: dicePips.pips,
        bonusdice: input.bonusDice,
        bonuspips: input.bonusPips,
        score: input.score,

        // Wild die / FP / CP flags
        wilddie: input.wildDie,
        showWildDie: input.showWildDie,
        canusefp: input.canUseFp,
        canusecp: input.canUseCp,
        fatepoint: false,
        fatepointeffect: input.fatepointEffect,
        characterpoints: 0,
        contact: false,
        cpcost: 0,
        cpcostcolor: 'black',

        // Visibility / kind
        isvisible: input.isVisible,
        isknown: false,
        isExplosive: input.isExplosive,
        type: input.classified.type,
        subtype: input.classified.subtype,

        // Opaque pass-through (Foundry types finalize doesn't touch)
        actor: input.actorRef as RollData['actor'],
        token: input.tokenRef as RollData['token'],
        targets: input.targetsRef as RollData['targets'],
        target: input.targetRef as RollData['target'],
        itemid: input.itemId,

        // Penalties
        actionpenalty: input.penalties.actionPenalty,
        woundpenalty: input.penalties.woundPenalty,
        stunnedpenalty: input.penalties.stunnedPenalty,
        otherpenalty: input.otherPenalty,

        // Stable defaults — handlers don't write these; they're shaped by the
        // dialog (multishot, shots, fulldefense, timer) or set by execute (rollmode).
        multishot: false,
        shots: 1,
        fulldefense: false,
        timer: 0,
        template: 'systems/od6s/templates/roll.html',
        vehiclespeed: 'cruise',
        vehiclecollisiontype: 't_bone',
        vehicleterraindifficulty: input.vehicleTerrainDifficulty,

        // Difficulty
        difficulty: input.difficulty,
        isoppasable: isOppasable,

        // Modifiers sub-object
        modifiers: {
            range: input.range,
            attackoption: 'OD6S.ATTACK_STANDARD',
            calledshot: '',
            cover: '',
            coverlight: '',
            coversmoke: '',
            miscmod: input.miscMod,
            scalemod: input.scaleMod,
        },

        // Bucket-owned fields with safe defaults — handler bucket overrides each.
        attribute: null,
        damagetype: '',
        damagescore: 0,
        stundamagetype: '',
        stundamagescore: 0,
        damagemodifiers: [],
        difficultylevel: input.difficultyLevel,
        scaledice: 0,
        seller: '',
        vehicle: '',
        source: '',
        range: input.range,
        only_stun: false,
        can_stun: false,
        stun: false,
        attackerScale: 0,
        specSkill: '',

        // Bucket overrides — handler-owned fields take precedence over the
        // safe defaults above. The Pick-typed bucket guarantees only valid
        // RollData fields can land here.
        ...input.bucket,
    };
}
