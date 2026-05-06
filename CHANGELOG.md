# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Historical release notes prior to this changelog live on the original
GitLab wiki at <https://gitlab.com/vtt2/opend6-space/-/wikis/Release-Notes>.

## [Unreleased]

### Changed

- Extracted four pure helpers from `roll-execute.ts` into
  `roll-execute-math.ts` — `applyDicePenalties`, `buildRollString`,
  `detectWildDieResult`, `assembleDamageDice` — covered by 16 new
  unit tests. Roll-execution behaviour unchanged; the orchestration
  file shrinks by ~55 LOC and the damage-modifier pipeline (scale,
  fatepoint str-doubling, vehicle-ram, pip bonuses) is now testable
  without Foundry globals (#59 part 1).

## [2.5.0] - 2026-05-06

Two user-facing bug fixes (#40, #86) plus the close-out of three
long-running internal-decomposition issues (#98 `setupRollData` →
typed per-roll-type handlers; #83 `actor-sheet.ts` 788 → 401 LOC;
#57 / #56 discriminated-union narrowing across the codebase).

### Added

- 25 pure typed handlers for `setupRollData` under
  `src/module/apps/roll-helpers/` — one per `(type, subtype)` roll
  path — plus a `runFinalize` step that owns the COMMON-fields
  partition. The handler dispatch is exhaustiveness-checked at
  compile-time via the `RollTypeKey` discriminated union (#98).
- Smoke specs covering action rolls (brawlattack, vehicleramattack,
  vehicletoughness) and the melee-range preflight gate, exercising
  paths the unit/domain layers can't reach (#98).
- 1010 lines of new domain tests in `tests/domain/` covering the
  weapon, action, damage/resistance, skill, and resource (funds /
  purchase) handler buckets (#98).

### Changed

- `setupRollData` rewritten as a thin coordinator (preflight →
  classifyRoll → adaptContext → `HANDLERS[key]` → runFinalize),
  replacing the legacy 650-line single function with 30+ mutable
  locals. RFCs surfaced during the cutover and applied: `+5` magic
  constant on action-meleeattack removed (no rules backing, #100);
  `vehicleramattack` adds `ram.score` once instead of twice (#103);
  `attackerScale` derives unconditionally from the actor for attack
  rolls with no targets (#104). The decomposition also unblocked
  Audit-A — `fatepointeffect` doubling now routes through
  `FinalizeInput.diceMultiplier` so damaged / `roll_mod` re-derives
  can't overwrite it (#98 / closes #82).
- `actor-sheet.ts` decomposed in four phases (#107-#109, #111):
  788 → 401 LOC. Item categorization and sci-fi defaults extracted
  to `actor-helpers/`; roll and inventory-transfer wiring extracted
  to `sheet-helpers/`; drag handlers and crew helpers split into
  `sheet-listeners/`. `_prepareContext` typed end-to-end and most
  trivial `any` annotations dropped (closes #83).
- `roll-setup.ts` pre-decomposition: distance→range bucketing,
  weapon mods/stun/modifier math, and action / penalty / ram /
  bonusdice math all extracted into pure unit-tested helpers
  (`difficulty-math.ts`, `weapon-context-math.ts`, `action-math.ts`,
  PRs #95-#97). 717 → 678 LOC; ~50 unit tests added (closes #82).
- Discriminated `Actor` / `Item` unions in `types/od6s.d.ts` plus
  type-guard helpers in `system/type-guards.ts`
  (`isCharacterActor`, `isVehicleActor`, `isWeaponItem`, … and the
  two combined guards added this release). Per-file narrowing
  swept across `OD6SActor`, `OD6SItem` instance methods,
  `roll-execute`, `roll-difficulty`, chat-log listeners, skills,
  weapons, explosives, advance, item-crud, drops, crew-vehicle,
  socketlib, item-sheet, chat-menu, opposed (#88-#94).
- `OD6SVehicleSystem` now declares `skill` / `specialization` /
  `attribute` / `move` / `shields` / `sensors`, matching
  `vehicle-common.ts`. `OD6SVehicleWeaponItemSystem` and
  `OD6SStarshipWeaponItemSystem` now declare the runtime-derived
  `stats` snapshot and `subtype` populated by
  `prepareDerivedData`. `OD6SCharacterSystem.vehicle` widened to
  mirror the `sendVehicleData` socket payload (#57 / PR #110).
- Actor-sheet listener modules now take the sheet root as
  `HTMLElement` rather than a single-element `HTMLElement[]`. Drops
  the `[root]` shim from `_onRender` and the `const el = html[0]`
  prologue from each listener (#83).
- `Collection<T>` now declares its iterator as `IterableIterator<T>`
  (matching Foundry runtime behaviour) instead of inheriting Map's
  `[key, value]` iteration. `Document.updateDocuments` /
  `deleteDocuments` are also typed. Removes 15 stale `as any` casts
  in migration, explosives, and chat-log code (#56).
- `OD6SCharacterSystem` now declares `credits` and `funds`, matching
  the actual `data/actor/fields/common.ts` schema. Drops the
  `(game as any)` and `(canvas as any)` casts that were papering over
  the gap (14 game / 2 canvas sites) and the `(buyer.system as any)`
  casts in inventory transfer (#56).
- `GameSystem.template` is now typed (Foundry's `template.json`
  descriptor used by item-sheet creation/edit dialogs), and several
  Handlebars accumulators are typed as `Record<string, T>` instead
  of being indexed via `as any`. `OD6SItem.createDialog` now takes a
  typed `data` parameter (#56).
- `roll-setup.ts` and `item.ts` now narrow `actor` and `item` via
  the existing type-guard helpers (plus two new combined guards
  `isAnyWeaponItem` / `isVehicleBorneWeaponItem`) instead of
  ad-hoc `as OD6SCharacterSystem` / `as OD6SWeaponItemSystem`
  casts. ~25 narrowing casts removed; the remaining surface in
  `OD6SItem.roll()` is documented (#57).

### Fixed

- Throwing a second instance of the same explosive item before the
  first resolves no longer clobbers the first throw's flags. The
  per-throw state (`explosiveTemplate` / `explosiveOrigin` /
  `explosiveRange` / `explosiveSet`) was scalar on the item document,
  so throw 2 overwrote the region pointer set by throw 1 and throw 1
  could no longer be resolved. Replaced with a per-region keyed map
  at `flags.od6s.explosivePending.<regionId>`; the region id is
  threaded through `OD6SItem.roll(parry, regionId)` and stamped on
  each attack chat message as `flags.od6s.template`, so cleanup
  paths address only their own throw's entry. Migration drops the
  legacy scalars on world upgrade (#40).
- Auto-explosive zone-damage code now reads target dodge from
  `actor.system.dodge.score` (via a type-guarded helper) instead of
  flat `(actor as any).dodge`, which was always `undefined` — so
  `undefined > total` always returned `false` and the
  dodge-vs-explosive evade branch never fired. High-dodge targets
  now actually evade as intended (#86).
- Advanced-skill check on action-routed rolls now consults the
  resolved skill instead of the action item itself. Legacy code
  cast `this.system as OD6SSkillItemSystem` and read
  `isAdvancedSkill` off the action item, where it was always
  undefined → falsy, so advanced skills incorrectly had their
  linked attribute folded into the score. Surfaced during the #57
  narrowing of `item.ts` (#57).
- `roll-action.ts` vehicle-action dispatch tested
  `actor.type === 'starship'` twice instead of `'vehicle'` and
  `'starship'`, so any vehicle-action path on a vehicle actor (not
  starship) crashed in `undefined.specialization`. Caught by the new
  tier-3-action-rolls smoke spec (#98).
- Stun-flag schema typo on the explosive-without-zones path was
  writing to `flags.od6s.stuns` (existing schema field) instead of
  the intended `stun` boolean. Surfaced while extracting weapon
  mods/stun math; fixed inline (#82).
- Effect-mod accumulator on weapon stats now uses an explicit
  defined-check rather than truthiness, so a `0` effect doesn't
  silently fall back to the base score (#82).
- Apply-damage chat-log handler restructured to remove the
  duplicate `actor.update` call and the asymmetric `-1D` / `-2D`
  payload it produced; defensive early-returns added to
  `applyDamage` / `applyWounds` for missing actors (#57 via PR #93).

### Removed

- Dead `od6sroll._metaphysicsRollDialog` method and the
  `MetaphysicsRollData` type. Zero call sites in code or templates;
  the `(actor as any).actions.length` access inside it would have
  thrown `TypeError` if reached (#86).
- Dead `brawlattack` top-level RollTypeKey path. No caller produces
  `type === 'brawlattack'`; `Actor.rollAction` wraps brawl as
  `{type: 'action', subtype: 'brawlattack'}` which routes to the
  `action-brawlattack` handler (#98).

## [2.4.0] - 2026-05-02

Chat-card accessibility pass closing #77, plus the per-roll mode
selector and a v13 ApplicationV2 delete-button regression fix that
surfaced while testing it.

### Added

- Chat cards now distinguish public / self-roll / GM-whisper / blind
  rolls with distinct, WCAG-AA-checked accent colors and a localized
  text badge in the header (Private / GM / Hidden) that screen readers
  pick up alongside the visual treatment (#77). The blind-roll default
  is a neutral slate grey to stay legible over busy maps, per the
  accessibility request in the issue.
- Four client-scoped color pickers and a chat background-opacity
  slider, registered together in the settings UI. Independent from
  the existing sheet-opacity slider — chat density makes the trade-offs
  different, so it gets its own knob.
- Per-roll **Mode** selector in the roll dialog footer (mirrors the
  existing sheet-mode footer pattern). Defaults to `gmroll` for GMs
  who have **Hide GM rolls** on, public otherwise; the explicit dialog
  choice always wins over the auto-private setting.
- `getWeaponRange` regression coverage for the calculated-range
  branches (#75).

### Fixed

- Trash icon on chat cards now actually deletes the message. Foundry
  v13's ApplicationV2 action map (`ChatLog`) requires
  `data-action="deleteMessage"` on the button — the V2-migrated
  templates were missing it, so clicks were no-ops.
- Players can roll from their character sheet again (#76) — fixed
  before the chat work, included here.

### Removed

## [2.3.0] - 2026-05-02

Closes the entire 2026-05-02 user-reported bug batch (#54, #55, #61,
#62, #63, #64, #65) plus the two follow-up sweeps (#67, #71) that
clear the broader root-cause classes.

### Added

- `+` controls for **Advantages**, **Disadvantages**, and **Special
  Abilities** lists on the actor sheet's Special tab (#62). Previously
  those lists could only be populated via drag-and-drop.

### Changed

- Sheet-mode (Normal / Free Edit) toggle lifted out of per-template
  inline placement into a single shared footer partial pinned to the
  bottom of every actor sheet (#63). Visually consistent across
  character / NPC / creature / vehicle / starship.
- Cargo-hold display on starship and vehicle sheets now lists every
  cargo-eligible item type the dialog allows you to add (vehicle-*
  on starships, starship-* on vehicles), not just `armor / weapon /
  gear`. The dialog and the displayed list are now in sync (#64).
- Remaining V1 `Dialog` / `renderTemplate` / `FormDataExtended`
  call sites in actor and item paths ported to their `DialogV2` /
  `foundry.applications.handlebars.renderTemplate` equivalents (item
  delete confirm, body-points roll confirm, sidebar Item create
  dialog, vehicle-transfer prompt). No more deprecation warnings
  from those flows in the v14 console.

### Fixed

- Drag-and-drop from compendium or sidebar Items onto an actor sheet
  now actually creates the item (#61). The handler called the V1-only
  `_onDropItemCreate`, which doesn't exist on `ActorSheetV2`; inlined
  the V2 `createEmbeddedDocuments` equivalent. Includes a fix for a
  pre-existing `ReferenceError` on cross-actor drop-moves that the
  prior `@ts-expect-error` was hiding.
- Drop a folder of Items onto an actor sheet to batch-add them; drop
  an ActiveEffect onto an actor sheet to copy it (#71). Both paths
  now re-enter the per-item drop pipeline, so all type dispatch,
  guards, and normalization apply identically to single-item drops.
- Description fields and other `<prose-mirror>` editors are now
  clickable (#54). Foundry's prose-mirror uses an absolutely-
  positioned toolbar, so without an explicit flex chain the
  contenteditable area collapsed to ~30px while floating toolbar
  buttons overlaid the rest of the box and intercepted clicks.
- Cargo-hold `+` button on starship/vehicle sheets now opens a
  V2-styled dialog and saves the item (#64). The earlier dialog used
  the deprecated V1 globals — unstyled grey/white text, broken save.
- Free-Edit mode toggle is now visible on NPC, Creature, Vehicle, and
  Starship sheets (#63). The control existed but was tucked into the
  header grid where users couldn't find it.
- Weapon Type, starship damage, vehicle damage, item attribute, gear
  price, armor damaged, manifestation difficulty, cybernetic
  location, and several other `<select>` fields no longer revert to
  their first option when other fields are edited (#55, #65, #67).
  Root cause: Handlebars context-shift bug inside `{{#each}}` blocks
  meant no option ever got the `selected` attribute, so the next
  submitOnChange clobbered storage with whatever the browser was
  showing. Swept across 14 templates total.
- Sheet header name input ("character name" big gold text) no longer
  has the top of letters clipped by `.sheet-header { overflow:
  hidden }` (#64 sub-fix). Browser default `h2 { font-size: 1.5em }`
  was cascading through the input's `font-size: 2.1em` to ~50px,
  exceeding the 44px box.

### Maintenance

- Dev dependencies updated (#53).

## [2.2.0] - 2026-05-02

Minor release covering nine PRs since 2.1.3.

### Added

- Sheet background opacity slider for actor and item sheets (#31).

### Changed

- Roll, advance, and specialize dialog markup polish — fixed `column>`
  typo, cpcost color, dice-suffix glyph, dialog-section headers, gold
  Roll button.

### Fixed

- Sheet persistence regressions — final residuals closed (#34, #42).
- Vehicle item subtype declared in the system manifest (#33, #35).
- Vehicle and starship sheets pick up the skill display migration
  done for character/NPC sheets (#29).
- Wounds dropdown now reflects the stored value on render (instead
  of always showing the first option).
- Character portrait click reliably opens the FilePicker on V2
  sheets (#30); the legacy `data-edit="img"` alone wasn't enough.

### Tests

- Weapon roll damage flag covered by smoke spec (#36).
- Weapon range and skill form persistence covered by smoke (#38).
- Smoke suite expanded to 32 specs, full pass.

## [2.1.3] - 2026-05-01

### Changed

- Decoupled skill display score from `system.score` so vehicle and
  starship sheets don't mutate the score at render time (#13, #29).

## [2.1.2] - 2026-05-01

### Fixed

- Weapon specialization rolls respect `rollMin` and attribute-relative
  range bands (#16, #17).

## [2.1.1] - 2026-05-01

### Fixed

- Auto-explosive end-to-end flow plus general v14 hardening for the
  explosive pipeline (#19).
- Sheet edits not persisting in Free Edit mode (#27).
- Vehicle defense and `embedded_pilot` truthy-check edge cases (#15,
  #18).
- Latent bugs surfaced during the type cleanup PR (#20) review (#21).

### Maintenance

- ~370 `no-explicit-any` warnings cleared across the codebase (#20).
- Smoke harness automates world setup with per-spec identity guard
  (#32).
- PR preview build workflow added; `upload-artifact` pinned to
  v7.0.1.

## [2.1.0] - 2026-04-29

First post-2.0.0 minor — focused on a sci-fi UI redesign and
pervasive type-safety cleanups across the codebase.

### Added

- Sci-fi themed redesign of the actor sheet and chat cards (#12).

### Changed

- `Actor.system` tightened to a discriminated union; obsolete
  `@ts-expect-error` suppressions cleared.
- Pure roll math extracted from `roll-execute.ts` for unit testing.
- `weapons.ts` and `labels.ts` extracted from `config-od6s.ts`.
- `actor.ts` and `crew-vehicle.ts` public signatures tightened.
- Item.roll lifts Actor narrowing to one place.
- `system/utilities` barrel passthroughs given proper types.
- `wounds.ts` helpers typed; vehicle damage shape added.
- Redundant `as-any` casts dropped in favor of `od6s.d.ts`.

### Maintenance

- Node 24 + pnpm 10.33.2; Sass to ^1.99.0; lockfile maintenance.
- CI upgraded to Node 24; GitHub Actions pinned by hash.
- Renovate global automerge disabled.
- Domain test fixture data inlined from docs/reference.

## [2.0.0] - 2026-04-27

Near-complete rewrite of the original OpenD6 Space system by Jim Raney,
targeting Foundry VTT v14. Game rules and compendium content are unchanged;
everything under the hood is new.

### Added

- **Foundry v14 support:** all v14 breaking changes addressed; minimum and
  maximum compatibility locked to v14
- **TypeDataModel:** actor and item data models converted from `template.json`
  to TypeDataModel classes, giving proper schema validation and typed access
- **ApplicationV2 sheets:** `OD6SActorSheet` and `OD6SItemSheet` rewritten
  with `HandlebarsApplicationMixin(ActorSheetV2 / ItemSheetV2)`; all ~30
  sub-forms and dialogs migrated from `FormApplication`/`Dialog` to
  ApplicationV2 or `DialogV2`
- **Scene Regions for explosives:** `ExplosivesTemplate` replaced the removed
  `MeasuredTemplate` API with a PIXI-based preview and a circular
  `RegionDocument` for blast radius, scatter, and zone damage
- **TypeScript:** full codebase converted to TypeScript; bundled via esbuild
- **Playwright smoke tests:** automated browser tests against a live Foundry
  instance covering boot, sheet rendering, settings, rolls, wounds, and combat
- **Vitest unit and domain suites:** pure-function and domain-rule coverage
  extracted from the TS modules
- **Taskfile:** `task setup`, `task foundry:start/stop/logs`, `task build:*`,
  `task release:patch/minor/major` for local development and releases
- **CI pipeline:** GitHub Actions with cosign keyless signing, CycloneDX SBOM,
  SHA-256 checksum, and dependency review on every PR
- **SVG status icons:** wound and wild-die icons sourced from
  `@iconify-json/game-icons` and built as SVGs, replacing the original PNGs
- **World migration:** automatic data migration from v12-era actor/item
  structures on first load

### Changed

- Build system replaced: gulp + npm to esbuild + pnpm
- SCSS migrated from `@import` to `@use`; output wrapped in `@layer system`
  for Foundry v14 Cascade Layers compatibility
- All jQuery removed from event handlers; replaced with vanilla DOM
  (`addEventListener`, `querySelector`)
- All Handlebars helpers updated to v2-compatible equivalents
  (`selectOptions`, `file-picker`, `prose-mirror`); v1 helpers
  (`checked`, `filePicker`, `editor`) unregistered
- `Roll.evaluate()` (async) replaced with `Roll.evaluateSync()` throughout
- Foundry global namespace references updated to v14 (`foundry.utils.*`,
  `foundry.applications.api.*`, etc.)
- Project moved from GitLab (`gitlab.com/vtt2/opend6-space`) to GitHub
  (`github.com/Jan-Ka/foundryvtt-opend6-space`)

### Removed

- `template.json` (superseded by TypeDataModel)
- All jQuery dependencies
- `MeasuredTemplate`-based explosive placement (replaced by Scene Regions)
- gulp and all associated build scripts
