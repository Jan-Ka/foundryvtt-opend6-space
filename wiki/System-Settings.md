# System Settings

OpenD6 Space exposes its rule toggles under
**Game Settings → Configure Settings → System Settings**. Settings are grouped
into menus; the menu in Foundry's settings list opens a dialog containing the
individual toggles.

This page is a tour of what each menu controls and which options most groups
benefit from changing. The in-app hint text is the authoritative description
of any one toggle — this page focuses on *why* you might reach for each menu.

## Rules Options

Toggles for rule variants that significantly change play:

- **Body Points** — replaces the wound-level system with a flat hit-point
  pool (parallel system from older WEG editions). Changes here override the
  Deadliness menu.
- **Stun damage increment** — when on, stun damage stacks toward the next
  wound level instead of being tracked separately.
- **High-hit damage** — optional rule that increases damage on rolls that
  exceed the resistance roll by a wide margin.
- **Weapon/armor damage** — applies wear to weapons and armor when used.
- **Track stuns** — surfaces stun duration and effects in the combat tracker.
- **Hide advantages/disadvantages** — for systems that do not use them.
- **Specialization dice** — toggles whether specializations grant +1D over
  the parent skill, vs. +1 pip variants.
- **Strength damage** — adds strength dice to unarmed/melee damage.

Most of these flags require a world reload to apply.

## Deadliness Options

Configures how dangerous wounds are. Adjusts the wound-level table used when
characters take damage. Has no effect when **Body Points** is enabled under
Rules Options.

## Wild Die

Configures the Wild Die behavior — which die in a pool is wild, what happens
on a 1, and how complications are surfaced in chat.

## Initiative

Choose between several initiative styles (per-round reroll, fastest-action,
fixed bonus, etc.) and configure tie-breaking.

## Difficulty

Tunes the difficulty pipeline:

- **Map range to difficulty** — converts range-band modifiers into difficulty
  steps rather than dice penalties.
- **Vehicle difficulty** — applies vehicle-scale difficulty modifiers.
- **Melee difficulty** — uses the optional melee-difficulty rule.
- **Scale Wounds** / **Scale Stuns** — apply older-edition WEG scale rules
  when computing wound and stun thresholds. Useful for groups bringing
  characters from earlier rulebooks; leave off for stock OpenD6.

## Automation

Controls how aggressively the system applies effects automatically — wound
penalties on rolls, defense reset per turn, action-list clearing, and so on.
Turn off to play closer to a paper-and-pencil flow.

## Character Points

Configures CP/FP economy: how many starting points characters receive, how
character-point spend interacts with rolls, and whether Funds and Fate
points are tracked.

## Active Attributes / Attributes Sorting

The *Active Attributes* menu chooses which of the six standard attributes
are in play (some campaigns drop or rename attributes). *Attributes Sorting*
controls display order on sheets.

## Custom Labels / Custom Fields

Rename built-in labels (e.g. "Reflexes" → something setting-specific) and
add custom data fields without writing a module.

## Reveal

Configures what is revealed to players in chat — full damage breakdowns,
opposed roll details, stun escalation messages.

## Misc Rules

Miscellaneous toggles that don't fit the other menus, including:

- **Sensors** — enables sensor-roll handling on starships/vehicles.
- **Explosive zones** / **Hide explosive templates** / **Explosive end of
  round** — tune how grenades and explosives are placed and resolved.
- **Cost** — selects the currency model used by inventory items.
- **Random hit locations** — rolls a hit location with each damage application.
