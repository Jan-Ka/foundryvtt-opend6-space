## Summary

<!-- One paragraph: what does this change and why. -->

## Linked issues

Closes #

## How to test

<!-- Concrete steps a reviewer can run. UI changes need a manual check
     in a live Foundry world; the type checker can't catch broken sheets. -->

1.
2.

## Checklist

- [ ] `pnpm run check` passes (lint + typecheck + tests)
- [ ] `pnpm run build` succeeds
- [ ] If the change affects sheets, dialogs, or rolls, I tested it in
      a live Foundry world.
- [ ] If the change affects compendium content, the YAML still builds
      via `pnpm run build:packs`.
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org).

## Notes for the reviewer

<!-- Anything unusual: tradeoffs you considered, things you weren't
     sure about, follow-ups deferred to a later PR. -->
