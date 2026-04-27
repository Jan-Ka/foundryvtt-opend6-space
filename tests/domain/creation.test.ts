/**
 * Domain drift tests: Character Creation & Game Basics (Chapters 1, 4, 6)
 *
 * Inline formula implementations derived from book rules. When pure functions
 * are extracted to src/, replace the inline implementations with imports and
 * these tests become regression guards.
 *
 * Fixtures:
 *   docs/reference/rules/chapter-1-character-basics/
 *   docs/reference/rules/chapter-4-cybernetics/
 *   docs/reference/rules/chapter-6-game-basics/
 *   docs/reference/examples/chapter-1-character-basics/
 *   docs/reference/examples/chapter-3-5-combined/
 *   docs/reference/examples/chapter-6-8-combined/
 */

import { describe, it, expect } from 'vitest';
import bodyPointsRule from '../../docs/reference/rules/chapter-1-character-basics/body-points-determination.json';
import strengthDamageRule from '../../docs/reference/rules/chapter-1-character-basics/strength-damage-determination.json';
import fundsRule from '../../docs/reference/rules/chapter-1-character-basics/funds-determination.json';
import creationPoolRule from '../../docs/reference/rules/chapter-1-character-basics/creation-point-pool.json';
import attributeCostRule from '../../docs/reference/rules/chapter-1-character-basics/creation-point-attribute-costs.json';
import skillCostRule from '../../docs/reference/rules/chapter-1-character-basics/creation-point-skill-costs.json';
import specCostRule from '../../docs/reference/rules/chapter-1-character-basics/creation-point-specialization-costs.json';
import multipleActionsRule from '../../docs/reference/rules/chapter-6-game-basics/multiple-actions.json';
import resultPointsRule from '../../docs/reference/rules/chapter-6-game-basics/result-points.json';
import cyberneticCostRule from '../../docs/reference/rules/chapter-4-cybernetics/determining-cybernetic-cost.json';
import bodyPointsExample from '../../docs/reference/examples/chapter-1-character-basics/body-points-example.json';
import strengthDamageExample from '../../docs/reference/examples/chapter-1-character-basics/strength-damage-example.json';
import fundsExample from '../../docs/reference/examples/chapter-1-character-basics/funds-example.json';
import multiActionsExample from '../../docs/reference/examples/chapter-6-8-combined/multiple-actions-dodge-example.json';
import cyberneticExample from '../../docs/reference/examples/chapter-3-5-combined/cybernetic-installation-example.json';

// ---------------------------------------------------------------------------
// Inline formulas
// Book ref: Chapter 1 p6-11
// ---------------------------------------------------------------------------

/** Body Points = dice roll total + 20 (Wild Die 1 treated as 1, not penalised). */
function bodyPoints(diceRollTotal: number): number {
    return diceRollTotal + 20;
}

/** Strength Damage die code = ceil(strengthDice / 2). Pips are dropped first. */
function strengthDamage(strengthDice: number): number {
    return Math.ceil(strengthDice / 2);
}

/** Creation-point cost for attribute dice. Book: 1 attribute die = 4 CP. */
function attributeCost(dice: number): number {
    return dice * 4;
}

/** Creation-point cost for skill dice. Book: 1 skill die = 1 CP. */
function skillCost(dice: number): number {
    return dice * 1;
}

/** Creation-point cost for specialization dice. Book: 3 spec dice = 1 CP. */
function specializationCost(specDice: number): number {
    return specDice / 3;
}

/**
 * Funds attribute.
 * Base 3, then apply modifiers; minimum 1.
 * @param perDice    Perception dice (subtract 1 if < 2, add 1 if >= 4)
 * @param knoDice    Knowledge dice (subtract 1 if < 2, add 1 if >= 4)
 * @param businessTotal  Total business dice including specializations (add 1 if >= 8)
 */
function computeFunds(perDice: number, knoDice: number, businessTotal: number): number {
    let funds = 3;
    if (perDice <= 1) funds -= 1;
    else if (perDice >= 4) funds += 1;
    if (knoDice <= 1) funds -= 1;
    else if (knoDice >= 4) funds += 1;
    if (businessTotal >= 8) funds += 1;
    return Math.max(1, funds);
}

/** Multi-action penalty in dice. Book: -1D per action beyond base allotment. */
function multiActionPenalty(actionsDeclared: number, baseAllotment = 1): number {
    return Math.max(0, actionsDeclared - baseAllotment);
}

/** Result points = skill total − difficulty. */
function resultPoints(skillTotal: number, difficulty: number): number {
    return skillTotal - difficulty;
}

/** Bonus to a related action = ceil(resultPoints / 2). */
function resultPointsRelatedBonus(rp: number): number {
    return Math.ceil(rp / 2);
}

/** Damage bonus from an attack roll = ceil(resultPoints / 5). */
function resultPointsDamageBonus(rp: number): number {
    return Math.ceil(rp / 5);
}

/** Cybernetic implant credit cost = installationDifficulty × 1000. */
function cyberneticCredits(installationDifficulty: number): number {
    return installationDifficulty * 1000;
}

/** Cybernetic upgrade credit cost = (installationDifficulty − 10) × 100. */
function cyberneticUpgradeCredits(installationDifficulty: number): number {
    return (installationDifficulty - 10) * 100;
}

// ---------------------------------------------------------------------------
// Fixture sanity
// ---------------------------------------------------------------------------

describe('fixture sanity', () => {
    it('body-points-determination rule is present', () => {
        expect(bodyPointsRule.id).toBe('body-points-determination');
    });
    it('strength-damage-determination rule is present', () => {
        expect(strengthDamageRule.id).toBe('strength-damage-determination');
    });
    it('funds-determination rule is present', () => {
        expect(fundsRule.id).toBe('funds-determination');
    });
    it('creation-point-pool rule is present', () => {
        expect(creationPoolRule.id).toBe('creation-point-pool');
    });
    it('creation-point-attribute-costs rule is present', () => {
        expect(attributeCostRule.id).toBe('creation-point-attribute-costs');
    });
    it('creation-point-skill-costs rule is present', () => {
        expect(skillCostRule.id).toBe('creation-point-skill-costs');
    });
    it('creation-point-specialization-costs rule is present', () => {
        expect(specCostRule.id).toBe('creation-point-specialization-costs');
    });
    it('multiple-actions rule is present', () => {
        expect(multipleActionsRule.id).toBe('multiple-actions');
    });
    it('result-points rule is present', () => {
        expect(resultPointsRule.id).toBe('result-points');
    });
    it('determining-cybernetic-cost rule is present', () => {
        expect(cyberneticCostRule.id).toBe('determining-cybernetic-cost');
    });
    it('body-points-example fixture is present', () => {
        expect(bodyPointsExample.id).toBe('body-points-example');
    });
    it('strength-damage-example fixture is present', () => {
        expect(strengthDamageExample.id).toBe('strength-damage-example');
    });
    it('funds-example fixture is present', () => {
        expect(fundsExample.id).toBe('funds-example');
    });
    it('multiple-actions-dodge-example fixture is present', () => {
        expect(multiActionsExample.id).toBe('multiple-actions-dodge-example');
    });
    it('cybernetic-installation-example fixture is present', () => {
        expect(cyberneticExample.id).toBe('cybernetic-installation-example');
    });
});

// ---------------------------------------------------------------------------
// Body Points — book example: 3D+1 Strength rolls 4, 6, 1 (wild) → 11+1+20=32
// ---------------------------------------------------------------------------

describe('bodyPoints', () => {
    it('example: roll 11 + pip 1 + base 20 = 32 (book p11)', () => {
        const rollTotal = bodyPointsExample.given.step1_dice_total
            .split('+')
            .map((s: string) => parseInt(s.trim()))
            .reduce((a: number, b: number) => a + b, 0);
        const pipBonus = bodyPointsExample.given.pip_bonus as number;
        expect(bodyPoints(rollTotal + pipBonus)).toBe(bodyPointsExample.expected.final_body_points);
    });

    it('minimum possible roll: Str 1D rolls 1 → 1+20=21', () => {
        expect(bodyPoints(1)).toBe(21);
    });

    it('base always added regardless of roll value', () => {
        expect(bodyPoints(0)).toBe(20);
        expect(bodyPoints(18)).toBe(38);
    });
});

// ---------------------------------------------------------------------------
// Strength Damage — book example: 3D → 2D, 6D+2 → 3D
// ---------------------------------------------------------------------------

describe('strengthDamage', () => {
    it('3D Strength → 2D Strength Damage (book p11)', () => {
        expect(strengthDamage(3)).toBe(2);
    });

    it('6D lift (pips dropped) → 3D Strength Damage (book p11)', () => {
        expect(strengthDamage(6)).toBe(3);
    });

    it('1D → 1D (ceil rounding: 1/2 = 0.5 → 1)', () => {
        expect(strengthDamage(1)).toBe(1);
    });

    it('5D → 3D (ceil: 5/2 = 2.5 → 3)', () => {
        expect(strengthDamage(5)).toBe(3);
    });

    it('4D → 2D (exact: 4/2 = 2)', () => {
        expect(strengthDamage(4)).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Creation point costs
// ---------------------------------------------------------------------------

describe('attributeCost — 4 CP per attribute die', () => {
    it('1D attribute → 4 CP', () => {
        expect(attributeCost(1)).toBe(4);
    });

    it('3D attribute → 12 CP', () => {
        expect(attributeCost(3)).toBe(12);
    });

    it('5D attribute (maximum) → 20 CP', () => {
        expect(attributeCost(5)).toBe(20);
    });
});

describe('skillCost — 1 CP per skill die', () => {
    it('1D skill → 1 CP', () => {
        expect(skillCost(1)).toBe(1);
    });

    it('3D skill (max starting bonus) → 3 CP', () => {
        expect(skillCost(3)).toBe(3);
    });
});

describe('specializationCost — 3 spec dice = 1 CP', () => {
    it('3 spec dice → 1 CP', () => {
        expect(specializationCost(3)).toBe(1);
    });

    it('6 spec dice → 2 CP', () => {
        expect(specializationCost(6)).toBe(2);
    });

    it('9 spec dice → 3 CP', () => {
        expect(specializationCost(9)).toBe(3);
    });
});

describe('novice character creation point pool', () => {
    it('novice characters receive 79 creation points', () => {
        expect(creationPoolRule.outputs[0].description).toMatch(/79/);
    });
});

// ---------------------------------------------------------------------------
// Funds — book example: 4D Kno, 6D+2D business → base 3+1+1=5D
// ---------------------------------------------------------------------------

describe('computeFunds', () => {
    it('book example: Kno 4D, business 8D total → 5D Funds', () => {
        // Per example: 3 (base) + 1 (Kno ≥4D) + 1 (business ≥8D) = 5
        expect(computeFunds(3, 4, 8)).toBe(5);
    });

    it('all average attributes → 3D Funds (no modifiers)', () => {
        expect(computeFunds(3, 3, 0)).toBe(3);
    });

    it('Per 1D and Kno 1D → reduced by 2 (but min 1)', () => {
        expect(computeFunds(1, 1, 0)).toBe(Math.max(1, 3 - 1 - 1));
    });

    it('Kno 4D and Per 4D (both high) → 5D Funds', () => {
        expect(computeFunds(4, 4, 0)).toBe(5);
    });

    it('minimum Funds is always 1', () => {
        expect(computeFunds(1, 1, 0)).toBeGreaterThanOrEqual(1);
    });

    it('weekly income: Funds × 175 credits (book default multiplier)', () => {
        const fundsTotal = 5;
        expect(fundsTotal * 175).toBe(875);
        expect(fundsExample.expected.weekly_income_credits).toBe(875);
    });
});

// ---------------------------------------------------------------------------
// Multiple Actions — book example: wait + dodge → -1D to dodge
// ---------------------------------------------------------------------------

describe('multiActionPenalty', () => {
    it('1 action → 0 penalty (no multi-action)', () => {
        expect(multiActionPenalty(1)).toBe(0);
    });

    it('2 actions → -1D (book example: wait + dodge)', () => {
        expect(multiActionPenalty(2)).toBe(1);
        expect(multiActionsExample.expected.multi_action_penalty).toBe('-1D');
    });

    it('3 actions → -2D', () => {
        expect(multiActionPenalty(3)).toBe(2);
    });

    it('4 actions → -3D (book: p55)', () => {
        expect(multiActionPenalty(4)).toBe(3);
    });

    it('base allotment 2: 2 actions → 0 penalty', () => {
        expect(multiActionPenalty(2, 2)).toBe(0);
    });

    it('base allotment 2: 4 actions → -2D', () => {
        expect(multiActionPenalty(4, 2)).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Result Points
// ---------------------------------------------------------------------------

describe('resultPoints', () => {
    it('exact match → 0 result points (Minimal success)', () => {
        expect(resultPoints(10, 10)).toBe(0);
    });

    it('roll 15 vs difficulty 10 → 5 result points (Good)', () => {
        expect(resultPoints(15, 10)).toBe(5);
    });

    it('roll 7 vs difficulty 10 → -3 result points (failure)', () => {
        expect(resultPoints(7, 10)).toBe(-3);
    });
});

describe('resultPointsRelatedBonus — half result points, rounded up', () => {
    it('5 RP → 3 bonus (ceil 5/2)', () => {
        expect(resultPointsRelatedBonus(5)).toBe(3);
    });

    it('4 RP → 2 bonus (exact)', () => {
        expect(resultPointsRelatedBonus(4)).toBe(2);
    });

    it('1 RP → 1 bonus', () => {
        expect(resultPointsRelatedBonus(1)).toBe(1);
    });
});

describe('resultPointsDamageBonus — one-fifth result points, rounded up', () => {
    it('5 RP → 1 damage bonus (ceil 5/5)', () => {
        expect(resultPointsDamageBonus(5)).toBe(1);
    });

    it('10 RP → 2 damage bonus (exact)', () => {
        expect(resultPointsDamageBonus(10)).toBe(2);
    });

    it('1 RP → 1 damage bonus (ceil 1/5)', () => {
        expect(resultPointsDamageBonus(1)).toBe(1);
    });

    it('11 RP → 3 damage bonus (ceil 11/5 = 2.2 → 3)', () => {
        expect(resultPointsDamageBonus(11)).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// Cybernetic cost formulas — book example: ear unit, difficulty 18
// ---------------------------------------------------------------------------

describe('cyberneticCredits — new implant cost', () => {
    it('installation difficulty 18 → 18,000 credits (book p43)', () => {
        const difficulty = cyberneticExample.final_pricing.price_difficulty as number;
        expect(cyberneticCredits(difficulty)).toBe(18_000);
        expect(cyberneticExample.final_pricing.credits_cost).toBe('18 × 1,000 = 18,000');
    });

    it('difficulty × 1000 formula holds for arbitrary values', () => {
        expect(cyberneticCredits(10)).toBe(10_000);
        expect(cyberneticCredits(25)).toBe(25_000);
    });
});

describe('cyberneticUpgradeCredits — upgrading existing implant', () => {
    it('difficulty 25 upgrade → (25-10)×100 = 1500 credits', () => {
        expect(cyberneticUpgradeCredits(25)).toBe(1_500);
    });

    it('difficulty 20 upgrade → 1000 credits', () => {
        expect(cyberneticUpgradeCredits(20)).toBe(1_000);
    });
});
