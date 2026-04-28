/**
 * Pure helper for the score that the actor sheet displays (and rolls from)
 * for a skill or specialization owned by an actor.
 *
 * The display score derives from three immutable-per-call inputs:
 *   - the item's own progression (`base + mod`)
 *   - whether the skill is "advanced" (rolls flat without the linked attribute)
 *   - the linked attribute's score
 *
 * This must be idempotent. Earlier code at the call site mutated
 * `item.system.score` by reading it, adding the attribute, and writing back —
 * which compounded over re-renders because `prepareDerivedData()` only resets
 * `score = base + mod` when the actor is re-prepared, not on every sheet
 * render. Computing from `base + mod` directly removes that aliasing.
 */

export interface SkillScoreInputs {
    /** The item's own base progression in pips. */
    base: number;
    /** Mod from advancement / active effects targeting `mod`, in pips. */
    mod: number;
    /**
     * True if this is an "advanced" skill — its score is rolled flat without
     * the linked attribute being added (Star Wars D6 / OpenD6 advanced skills).
     */
    isAdvancedSkill?: boolean;
    /** Linked attribute's score in pips. Ignored when `isAdvancedSkill`. */
    attributeScore?: number;
    /**
     * If true, the world is in flat-skill mode and the display score is the
     * raw item progression (`base + mod`) without the attribute.
     */
    flatSkills?: boolean;
}

/**
 * Compute the score that the sheet should render and rolls should use for a
 * skill or specialization.
 *
 * Pure: never reads or mutates anything outside its inputs.
 */
export function computeSkillDisplayScore(input: SkillScoreInputs): number {
    const own = (+input.base) + (+input.mod);
    if (input.flatSkills) return own;
    if (input.isAdvancedSkill) return own;
    return own + (+(input.attributeScore ?? 0));
}
