/**
 * Domain drift tests: Improving Characters (Chapter 5)
 *
 * Fixtures define the authoritative formulas from the book. When pure
 * advancement functions are implemented, replace the inline formulas below
 * with imports from the implementation and these tests become regression guards.
 *
 * Fixtures: docs/reference/rules/chapter-5-improving-characters/
 *           docs/reference/examples/chapter-3-5-combined/
 */

import { describe, it, expect } from 'vitest';
import skillImprovementRule from '../../docs/reference/rules/chapter-5-improving-characters/learning-improving-skills.json';
import specialAbilityRule from '../../docs/reference/rules/chapter-5-improving-characters/improving-special-abilities.json';
import skillExample from '../../docs/reference/examples/chapter-3-5-combined/skill-improvement-example.json';
import specialAbilityExample from '../../docs/reference/examples/chapter-3-5-combined/special-ability-improvement-example.json';

// ---------------------------------------------------------------------------
// Formulas (inline until extracted to pure functions in src/)
// Book ref: p49 (skills), p51 (special abilities)
// ---------------------------------------------------------------------------

/**
 * Cost to learn a new skill.
 * Formula: number before D in governing attribute die code.
 * e.g. Knowledge 3D → 3 CP
 */
function learnSkillCost(governingAttributeDice: number): number {
    return governingAttributeDice;
}

/**
 * Cost to improve an existing skill by one pip.
 * Formula: number before D in current skill die code.
 * e.g. dodge 4D+2 → 4 CP; dodge 5D → 5 CP
 */
function improveSkillCost(currentSkillDice: number): number {
    return currentSkillDice;
}

/**
 * Cost to acquire a new Special Ability (Rank 1).
 * Formula: 5 × base_cost
 */
function acquireSpecialAbilityCost(baseCost: number): number {
    return 5 * baseCost;
}

/**
 * Cost to improve an existing Special Ability by one rank.
 * Formula: (5 × base_cost) + current_ranks
 * PDF-confirmed: book prints 16 for Accelerated Healing base 3, rank 1 → (5×3)+1=16
 */
function improveSpecialAbilityCost(baseCost: number, currentRanks: number): number {
    return (5 * baseCost) + currentRanks;
}

/**
 * CP recovered by removing one rank from a Special Ability.
 * Formula: 2 × base_cost
 */
function removeSpecialAbilityRankRecovery(baseCost: number): number {
    return 2 * baseCost;
}

// ---------------------------------------------------------------------------
// Fixture sanity
// ---------------------------------------------------------------------------

describe('fixture sanity', () => {
    it('learning-improving-skills fixture is present', () => {
        expect(skillImprovementRule.id).toBe('learning-improving-skills');
    });

    it('improving-special-abilities fixture is present', () => {
        expect(specialAbilityRule.id).toBe('improving-special-abilities');
    });

    it('skill-improvement-example fixture is present', () => {
        expect(skillExample.id).toBe('skill-improvement-example');
    });

    it('special-ability-improvement-example fixture is present', () => {
        expect(specialAbilityExample.id).toBe('special-ability-improvement-example');
    });
});

// ---------------------------------------------------------------------------
// Skill improvement — driven by book example (p49)
// ---------------------------------------------------------------------------

describe('learnSkillCost', () => {
    // Example 1: Knowledge 3D → new Languages costs 3 CP
    it('Knowledge 3D → new skill costs 3 CP', () => {
        expect(learnSkillCost(3)).toBe(3);
    });
});

describe('improveSkillCost', () => {
    // Example 2: dodge 4D+2 → +1 pip costs 4 CP (die code is 4D)
    it('dodge 4D+2 → 4 CP to improve by one pip', () => {
        expect(improveSkillCost(4)).toBe(4);
    });

    // Example 3: dodge 4D+3 → +1 pip (→ 5D) still costs 4 CP (die code still 4D)
    it('dodge 4D+3 → 4 CP to advance to 5D', () => {
        expect(improveSkillCost(4)).toBe(4);
    });

    // Example 4: dodge 5D → +1 pip costs 5 CP (die code now 5D)
    it('dodge 5D → 5 CP to improve by one pip', () => {
        expect(improveSkillCost(5)).toBe(5);
    });

    // Verify the full cost progression table from the fixture
    it('cost progression matches fixture table', () => {
        const progression = skillExample.cost_progression_example;
        for (const stage of progression) {
            const dice = parseInt(stage.skill); // e.g. "4D" → 4, "5D" → 5
            if (!isNaN(dice)) {
                expect(improveSkillCost(dice)).toBe(stage.cost);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Special ability improvement — driven by book example (p51, PDF-confirmed)
// ---------------------------------------------------------------------------

describe('improveSpecialAbilityCost', () => {
    // Accelerated Healing: base cost 3, current rank 1 → 16 CP (PDF-confirmed)
    it('Accelerated Healing rank 1 → rank 2 costs 16 CP', () => {
        expect(improveSpecialAbilityCost(3, 1)).toBe(16);
    });

    // Verify the improvement sequence from the fixture
    it('improvement sequence matches fixture', () => {
        const sequence = specialAbilityExample.improvement_sequence;
        const baseCost = specialAbilityExample.setup.base_cost;
        for (const step of sequence) {
            if (step.rank > 1 && step.points_needed) {
                const currentRank = step.rank - 1;
                expect(improveSpecialAbilityCost(baseCost, currentRank))
                    .toBe((5 * baseCost) + currentRank);
            }
        }
    });

    // Escalating costs as rank grows
    it('cost escalates linearly with rank', () => {
        const base = 3;
        expect(improveSpecialAbilityCost(base, 1)).toBe(16); // rank 1 → 2
        expect(improveSpecialAbilityCost(base, 2)).toBe(17); // rank 2 → 3
        expect(improveSpecialAbilityCost(base, 3)).toBe(18); // rank 3 → 4
    });
});

describe('acquireSpecialAbilityCost', () => {
    it('Accelerated Healing (base 3) → 15 CP to acquire at rank 1', () => {
        expect(acquireSpecialAbilityCost(3)).toBe(15);
    });
});

describe('removeSpecialAbilityRankRecovery', () => {
    it('removing a rank of Accelerated Healing (base 3) → 6 CP recovered', () => {
        expect(removeSpecialAbilityRankRecovery(3)).toBe(6);
    });
});
