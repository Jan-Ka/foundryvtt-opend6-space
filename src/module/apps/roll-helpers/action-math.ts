/**
 * Pure helpers extracted from the action-subtype branch of setupRollData.
 * No Foundry globals — testable in isolation.
 */

export interface ActionSkill {
    score: number;
    /** Lower-cased attribute key (e.g. "agi", "str"). */
    attributeKey: string;
}

export interface ActionResolutionInput {
    /** The combat skill item the actor owns (already validated), or null when missing. */
    skill: ActionSkill | null;
    /** Attribute scores keyed by lower-case attribute name. */
    attributes: Record<string, { score: number }>;
    /** Whether the world uses flat-skill mode. */
    flatSkills: boolean;
    /** Attribute key to fall back to when no skill item is present. */
    fallbackAttributeKey: string;
}

export interface ActionResolution {
    score: number;
    /**
     * Set only when the resolution actually carries flat-pips (i.e. skill
     * present AND flat-skills enabled). The original switch left `flatPips`
     * untouched in the other branches, so callers should only assign when
     * this is non-undefined.
     */
    flatPips?: number;
}

/**
 * Roll types where wound / action / stun penalties are bypassed (the roll is
 * a pure outcome resolution, not a character action). Resistance, damage,
 * funds, purchase, and the two terminal-wound rolls all skip penalties.
 */
const PENALTY_BYPASS_TYPES = new Set([
    'mortally_wounded',
    'incapacitated',
    'damage',
    'resistance',
    'funds',
    'purchase',
]);

export function isPenaltyBypassType(rollType: string): boolean {
    return PENALTY_BYPASS_TYPES.has(rollType);
}

export interface PenaltyInputs {
    rollType: string;
    /** `data.actor.itemTypes.action.length`. */
    actionItemCount: number;
    /** `actor.system.stuns.current` for characters; 0 for non-characters. */
    stunsCurrent: number;
    /**
     * Already-computed wound penalty (callers should compute lazily, e.g.
     * `isPenaltyBypassType(type) ? 0 : od6sutilities.getWoundPenalty(actor)`).
     */
    woundPenalty: number;
}

export interface Penalties {
    woundPenalty: number;
    actionPenalty: number;
    stunnedPenalty: number;
    /** True when the roll type bypasses penalties; caller forces isVisible. */
    isBypass: boolean;
}

/**
 * Compute the wound / action / stun penalties for a roll. Bypass roll types
 * zero everything; otherwise action penalty is `count - 1` (one free action).
 */
export function computePenalties(input: PenaltyInputs): Penalties {
    if (isPenaltyBypassType(input.rollType)) {
        return { woundPenalty: 0, actionPenalty: 0, stunnedPenalty: 0, isBypass: true };
    }
    return {
        woundPenalty: input.woundPenalty,
        actionPenalty: input.actionItemCount > 0 ? input.actionItemCount - 1 : 0,
        stunnedPenalty: input.stunsCurrent,
        isBypass: false,
    };
}

/**
 * Resolve `data.score` (and optionally `flatPips`) for a skill-backed action
 * such as melee or brawl attacks.
 *
 * - Skill present, flat-skills on:  score = attribute, flatPips = skill.score
 * - Skill present, flat-skills off: score = skill.score + attribute
 * - Skill missing:                  score = fallback-attribute
 */
export function resolveSkillBackedAction(input: ActionResolutionInput): ActionResolution {
    if (input.skill) {
        const attrScore = input.attributes[input.skill.attributeKey]?.score ?? 0;
        if (input.flatSkills) {
            return { score: attrScore, flatPips: input.skill.score };
        }
        return { score: input.skill.score + attrScore };
    }
    return { score: input.attributes[input.fallbackAttributeKey]?.score ?? 0 };
}
