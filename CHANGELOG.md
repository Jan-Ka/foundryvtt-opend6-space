# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Historical release notes prior to this changelog live on the original
GitLab wiki at <https://gitlab.com/vtt2/opend6-space/-/wikis/Release-Notes>.

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

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
