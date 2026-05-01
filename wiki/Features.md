# Features

What the system supports out of the box. For tuning any of these, see
[System Settings](System-Settings).

## Actor types

- **Character** — full PC sheet with attributes, skills, specializations,
  wounds/stuns, action list, character points.
- **NPC** — lighter sheet for adversaries and named NPCs.
- **Creature** — for fauna and non-humanoid threats.
- **Vehicle** — ground/air vehicles with crew slots, scale, and damage levels.
- **Starship** — vehicles with sensor and starship-scale handling.
- **Container** — inventory grouping (crates, lockers, footlockers).

## Item types

19 item types covering skills, specializations, weapons, armor, vehicles and
vehicle weapons, manifestations (metaphysics powers), gear, character
templates, and more. All item types render dedicated sheets.

## Rolls

- Skill, attribute, and weapon rolls from sheets and chat cards.
- Wild Die with configurable behavior (see the Wild Die settings menu).
- Difficulty pipeline with range bands, scale, melee and vehicle modifiers.
- Edit-difficulty and edit-damage from chat (GM adjusts a roll after the fact
  and successes recompute automatically).
- Initiative rolls integrated with Foundry's combat tracker.

## Damage & wounds

- Wound-level system with configurable Deadliness (or Body Points as an
  alternative; see Rules Options).
- Stun damage tracked separately or stacked toward wounds (configurable).
- Vehicle damage levels with armor and shield handling.
- Strength damage on melee (optional).
- Armor DR application; optional armor wear on hits.

## Combat

- Foundry combat tracker with per-round initiative styles.
- Action list for declared/multi-action penalties.
- Opposed-roll queue (requires the [socketlib](https://foundryvtt.com/packages/socketlib)
  module).
- Stun escalation rules (-1D / -2D / unconscious).

## Vehicles & starships

- Crew slots and crew-to-vehicle data sync (via socketlib).
- Vehicle and starship scales applied to attacks and resistance rolls.
- Sensor rolls (optional, see Misc Rules).
- Passenger damage on vehicle hits.

## Character creation & advancement

- Skill / specialization budget allocation during creation.
- Character-template items as a starting kit applied to a new character.
- CP-cost formulas for skills, attributes, and specializations, including the
  metaphysics 2× cost multiplier.

## Metaphysics

- Manifestation items with sense / channel / transform dispatch.
- Metaphysics roll dialog driven by manifestation effects.

## Explosives

- Blast zone calculation and PIXI preview on the canvas.
- Scatter and target detection by zone.
- Region creation on placement (configurable; see Misc Rules).

## What is intentionally manual

A few things the system does **not** automate, by design:

- **Wild die complications** — surfaced in chat as a flag; the GM/player
  decides what the complication means in fiction.
- **Edit-difficulty / edit-damage** — the *decision* to adjust a roll is a GM
  judgement call. Once you decide, the math is automatic.
- **Choose-target** dialogs require tokens placed on an active scene.
- **Natural healing** is a paper schedule (Chapter 11) — no automated timer.
