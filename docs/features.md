# OpenD6 Space — Feature Inventory & Test Coverage Map

This document describes every major feature of the system and its current test
coverage. Use it to decide where to add tests, not just how.

Coverage key: ✅ tested · 🔶 partial · ❌ none · 🚫 genuinely untestable

---

## Actor Types

| Actor | Schema | Sheet renders | Automation |
|-------|--------|--------------|------------|
| character | ✅ data model registered | ✅ Playwright tier-2 | 🔶 wounds/stun tested; action list clearing, mortally-wounded loop not |
| npc | ✅ | ✅ | ❌ no behavior test |
| creature | ✅ | ✅ | ❌ |
| vehicle | ✅ schema fields (Playwright tier-3f) | ✅ | 🔶 applyDamage tested; collision math, crew sync not |
| starship | ✅ | ✅ | ❌ |
| container | ✅ | ✅ | ❌ |

---

## Item Types

All 19 item data models registered ✅ (Playwright tier-1). All sheets render ✅ (tier-2).

| Item | Schema defaults | Roll | Special logic |
|------|----------------|------|---------------|
| skill | ✅ | ✅ Playwright tier-3e | ❌ attribute-lookup edge cases |
| specialization | ✅ | ❌ | ❌ |
| weapon | ✅ | ✅ Playwright tier-3g | ❌ called-shot modifiers, stun weapon |
| armor | ✅ | — | ❌ DR application, damage-level tracking |
| vehicle (item) | ✅ Playwright tier-3f | — | ❌ (new type, minimal schema) |
| vehicle-weapon | ✅ | ❌ | ❌ |
| manifestation | ✅ | ❌ | ❌ sense/channel/transform dispatch |
| character-template | ✅ | — | ❌ bulk-apply to actor |
| All others | ✅ | — | ❌ |

---

## Roll System

Entry points and what is tested:

| Roll path | Unit test | Playwright |
|-----------|-----------|------------|
| `actor.rollAttribute(attr)` | ❌ | ✅ tier-3b |
| `skill.roll()` | ❌ | ✅ tier-3e |
| `item.roll()` (weapon) | ❌ | ❌ |
| `item.roll()` (manifestation) | ❌ | ❌ |
| `actor.rollAction(actionId)` | ❌ | ❌ |
| `InitRollDialog` / initiative | ❌ | ✅ tier-3d (combat) |
| Difficulty modifier pipeline | ✅ `difficulty-math.test.ts` | — |
| Wild die (WildDie term) | ✅ `dice.test.ts` | ❌ dialog flow |
| Range bucketing → modifier | ✅ `combat.test.ts` | — |
| Min-3 combat floor | ✅ `combat.test.ts` | — |
| Strength damage formula | ✅ `combat.test.ts` | — |

**Edit-difficulty / edit-damage (chat card buttons):**

The `#onSubmit` math is:
```
diff         = newBaseDifficulty − oldBaseDifficulty
newDifficulty = oldDifficulty + diff
success      = rollTotal >= newDifficulty
```
- Pure math: ✅ `computeDifficultyUpdate` in `difficulty-math.ts`, tested in `edit-difficulty-math.test.ts`
- Full flow: ✅ `tier-3-edit-difficulty.spec.ts` (Playwright tier-3h)

---

## Damage & Wounds

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Wound level transitions (`computeNewWoundLevel`) | ✅ `damage.test.ts` | ✅ tier-3c |
| stunDamageIncrement=true path | ✅ `damage.test.ts` | — |
| Vehicle damage transitions (`computeNewDamageLevel`) | ✅ `damage.test.ts` | ✅ tier-3e |
| Vehicle damage schema default (OD6S.NO_DAMAGE) | ✅ regression guard | ✅ tier-3e |
| Wound penalty lookup | ✅ `wounds-lookup.test.ts` | — |
| Body points system | ❌ | ❌ |
| Stun effect escalation (2×/3× resistance = -2D/unconscious) | ❌ (inline in `opposed.ts`) | ❌ |
| `applyDamage` on vehicle actor | ❌ unit | ✅ tier-3e |
| `applyWounds` on character | ❌ unit | ✅ tier-3c |
| Armor DR application | ❌ | ❌ |
| Armor damage on wounds | ❌ | ❌ |
| Mortally wounded check loop | ❌ | ❌ |
| Natural healing schedule | ❌ (no impl) | ❌ |

---

## Combat System

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Initiative roll | ❌ | ✅ tier-3d |
| Combat create / combatant add | ❌ | ✅ tier-3d |
| Per-round initiative reroll | ❌ | ❌ |
| Action list cleared end-of-round | ❌ | ❌ |
| Defense reset per turn | ❌ | ❌ |
| Stun duration decrement | ❌ | ❌ |
| Opposed roll queue | ❌ | ❌ |
| Opposed roll winner logic | ❌ (inline in `opposed.ts`) | ❌ |
| Stun scaling (-1D/-2D/unconscious) | ✅ `stun-escalation.test.ts` | ❌ |

---

## Vehicle & Starship Systems

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Vehicle actor schema init | ❌ unit | ✅ tier-3f |
| Vehicle item schema init | ❌ unit | ✅ tier-3f |
| Crew add / remove | ❌ | ❌ |
| Vehicle data sync to crew | ❌ | 🚫 (socketlib, multi-client) |
| Vehicle collision damage | ❌ (no pure fn) | ❌ |
| Passenger damage calculation | ❌ | ❌ |
| Embedded pilot roll | ❌ | ❌ |
| Scale modifier branches | ✅ `scale.test.ts` | ❌ |
| Sensor roll | ❌ | ❌ |

---

## Character Creation & Advancement

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Skill/spec budget allocation | ✅ `character-creation-helpers.test.ts` | — |
| CP cost formulas (skill/attr/spec) | ✅ `advancement.test.ts` | — |
| Attribute min/max enforcement | ❌ | ❌ |
| Wizard UI (template select → finish) | ❌ | ❌ (multi-step; automatable) |
| `applySkillIncrease` / `applySkillDecrease` | ✅ | — |
| `applyAddSpec` / `applySpecDelete` | ✅ | — |
| Metaphysics skill cost (2× multiplier) | ❌ | ❌ |

---

## Metaphysics

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Manifestation schema | ✅ data model registered | ✅ tier-2 sheet |
| Sense/channel/transform dispatch | ❌ | ❌ |
| Metaphysics roll dialog | ❌ | ❌ |
| Advancement cost formula | ✅ `computeMetaphysicsAttributeCost`; tested in `metaphysics.test.ts` | ❌ |

---

## Settings & Config Forms

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| All settings menus render | ❌ | ✅ tier-3a |
| Settings affect roll modifiers | ❌ | ❌ |
| Deadliness level changes wound table | ❌ | ❌ |

---

## Explosives

| Feature | Unit test | Playwright |
|---------|-----------|------------|
| Blast zone calculation (`getBlastRadius`) | ✅ `computeBlastZone` extracted; tested in `explosives.test.ts` | ❌ |
| Scatter logic | 🚫 canvas-bound | 🚫 |
| Region creation on placement | 🚫 | 🚫 |
| Target detection by zone | 🚫 | 🚫 |

---

## Genuinely Untestable

These require human judgment or live canvas interaction and cannot be covered by
any automated test:

- **PIXI explosives preview** — spatial judgment on a rendered grid
- **Multi-client socket sync** — requires two simultaneous browser sessions
- **Choose-target dialog** — requires tokens placed on an active scene
- **Wild die complication narrative** — GM/player decision point, not a pass/fail
- **Edit-difficulty / edit-damage judgment** — the *decision* to adjust is manual; the mechanical result IS testable (see Roll System above)

---

## Testing Backlog (prioritised)

### Tier A — Extract pure function + unit test (high value, low effort)

1. ✅ **Stun escalation** — `computeStunEffect` in `opposed.ts`; tested in `stun-escalation.test.ts`
2. ✅ **Blast zone** — `computeBlastZone` in `explosives.ts`; tested in `explosives.test.ts`
3. ✅ **Edit-difficulty math** — `computeDifficultyUpdate` in `difficulty-math.ts`; tested in `edit-difficulty-math.test.ts`
4. ✅ **Scale modifier** — `computeScaleModifier` in `utilities/scale.ts`; tested in `scale.test.ts`
5. ✅ **Metaphysics CP cost** — `computeMetaphysicsAttributeCost` in `utilities/metaphysics.ts`; tested in `metaphysics.test.ts`

### Tier B — New Playwright smoke tests (automatable flows not yet wired)

6. ✅ **Edit-difficulty flow** — `tier-3-edit-difficulty.spec.ts`: roll → set known difficulty → dialog → submit → verify flags
7. ❌ **Edit-damage flow** — roll → click `.edit-damage` → submit → verify `damageScore` flag
8. ✅ **Weapon roll** — `tier-3-weapon-roll.spec.ts`: character + weapon → `item.roll()` → chat message with damage flags
9. ❌ **Vehicle collision** — complex (vehicleCollision wraps DialogV2.input, needs UI interaction mid-flow)
10. ❌ **Character creation wizard** — multi-step UI; automatable but not yet wired

### Tier C — Logic without implementation (rules exist, code does not)

11. Natural healing schedule (Chapter 11)
12. Jump/fatigue math (Chapter 7)
13. Body points damage application (parallel system to wound levels)
