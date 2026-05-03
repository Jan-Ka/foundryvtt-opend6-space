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
