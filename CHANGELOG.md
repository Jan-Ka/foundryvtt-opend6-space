# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Historical release notes prior to this changelog are at the project
[wiki](https://github.com/Jan-Ka/foundryvtt-opend6-space/wiki) (the original
GitLab wiki at <https://gitlab.com/vtt2/opend6-space/-/wikis/Release-Notes>
remains available for entries that pre-date the GitHub move).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

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
