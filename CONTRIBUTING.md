# Contributing to OpenD6 Space

Thanks for your interest in helping out! This system is a community
project; bug reports, translations, and pull requests are all welcome.

## Quick links

- Bugs and feature requests: <https://github.com/Jan-Ka/foundryvtt-opend6-space/issues>
- Discussion: [Discord](https://discord.gg/nh925pW2rU)
- Security issues: see [SECURITY.md](SECURITY.md) — please **do not**
  file public issues for those.

## Development setup

You need Node.js ≥ 22 and pnpm 10 (the version is pinned via
`packageManager` in `package.json` — corepack will pick it up
automatically).

```bash
pnpm install         # installs deps and wires up git hooks via husky
pnpm run build       # bundle JS, compile SCSS, build packs + translations
pnpm run watch       # rebuild JS/SCSS on change
pnpm run check       # lint + typecheck + tests
```

The first `pnpm install` runs `husky` and configures `core.hooksPath`,
which enables:

- **pre-commit**: `lint-staged` runs ESLint with `--fix` on staged
  TypeScript files.
- **commit-msg**: rejects commits whose messages contain AI-assistant
  attribution trailers (Co-Authored-By for Claude/Anthropic/Copilot/etc.
  or "🤖 Generated with" lines). Bypass with `--no-verify` only when
  intentional.

## Branching and pull requests

- Target `main` with pull requests.
- Keep PRs focused — one logical change per PR is much easier to review.
- Run `pnpm run check` and `pnpm run build` locally before pushing.
- For UI changes, please verify in a live Foundry world; the type
  checker can't catch broken sheets.

## Smoke tests against a live Foundry

```bash
pnpm exec playwright install chromium   # one-time
pnpm run test:smoke                     # all smoke specs
pnpm run test:smoke:ui                  # interactive Playwright UI
```

Requires a Foundry world running with `od6s` selected. Defaults to
`http://localhost:30000` and user `Gamemaster` with no password;
override via `FOUNDRY_URL`, `FOUNDRY_USER`, `FOUNDRY_PASSWORD`.

The probes are documented in [docs/test-runbook.md](docs/test-runbook.md).

## Code style

- TypeScript across `src/module/`. The bundle is built with esbuild
  (`pnpm run build:ts`).
- Vanilla DOM (`addEventListener`, `querySelector`) — no jQuery in new
  code; legacy jQuery is already removed.
- Templates in `src/templates/` use only v2-compatible Handlebars
  helpers (`{{selectOptions}}`, `{{#if X}}checked{{/if}}`, `<file-picker>`,
  `<prose-mirror>`).
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for an architecture deep-dive — module
  layout, sheet patterns, conventions.

## Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org).
The `commit-msg` git hook runs `commitlint` and rejects messages that
don't follow the format.

```text
<type>(<optional scope>): <subject>

<optional body>

<optional footers>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`build`, `ci`, `perf`, `style`. Examples:

```text
fix(roll): correct wound-threshold rounding for severely-wounded
feat(actor): add embedded-pilot UI for starships
docs(contributing): document the commitlint rules
```

Other rules:

- Imperative mood in the subject ("fix", not "fixed" or "fixes").
- The body should explain *why*, not *what* — the diff shows what.
- No AI-assistant attribution trailers (the commit-msg hook refuses
  Claude / Anthropic / Copilot / Cursor / Aider / Codeium / Windsurf
  Co-Authored-By lines and "🤖 Generated with" markers).

## Cutting a release

1. Bump `"version"` in `src/system.json` and `package.json` to the
   next semver string and update `"verified"` if you tested against a
   newer Foundry build number.
2. Populate the `[Unreleased]` section in `CHANGELOG.md` with the
   changes since the last release.
3. Commit: `chore(release): v2.1.0`
4. Run the appropriate task:

   ```bash
   task release:patch   # v2.1.0 → v2.1.1
   task release:minor   # v2.1.0 → v2.2.0
   task release:major   # v2.1.0 → v3.0.0
   ```

   The task verifies that `src/system.json` and `package.json` already
   carry the computed next version, then creates and pushes the tag.
   CI triggers automatically on `v*` tags and produces the signed
   `od6s.zip`, SBOM, and checksum.

## Verifying a release

Release artifacts are signed with [cosign](https://docs.sigstore.dev/)
keyless signing via GitHub Actions OIDC. To verify a downloaded
`od6s.zip`:

```bash
cosign verify-blob \
  --certificate od6s.zip.pem \
  --signature   od6s.zip.sig \
  --certificate-identity-regexp 'https://github\.com/Jan-Ka/foundryvtt-opend6-space/\.github/workflows/release\.yml@refs/tags/.+' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  od6s.zip
```

Each release also includes a CycloneDX SBOM (`sbom.cdx.json`) and a
SHA-256 checksum file (`od6s.zip.sha256`).

## Translations

Translations are community-contributed. See `src/lang/` and
`compendia/`. New languages and corrections to existing strings are
both welcome.
