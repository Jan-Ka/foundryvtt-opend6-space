# Org Migration Checklist: `Jan-Ka` → `nonex-ist`

Audit of every reference that needs updating when transferring this repo from
`github.com/Jan-Ka/foundryvtt-opend6-space` to
`github.com/nonex-ist/foundryvtt-opend6-space`.

GitHub's repo-transfer flow sets up indefinite 301 redirects for git and web
URLs, so most things keep working — but any string we ship to users (manifest
URLs, cosign identity, install snippets) should be rewritten to the new path
before the next release.

## Phase 1 — pre-transfer edits (this branch)

### Load-bearing (Foundry auto-update + install)

- `src/system.json`
  - L186 `url`
  - L187 `manifest` — every existing install pulls updates from this URL. Old
    URL keeps working via redirect, but the in-manifest value should be
    rewritten so the next release ships with the new canonical URL.
  - L188 `download`
  - L189 `license`
  - L44 author `name` (`Jan-Ka`)
  - L45 author `url` (`https://github.com/jan-ka`)
- `package.json`
  - L31 `homepage`
  - L34 `repository.url`
  - L37 `bugs.url`
  - L29 `author` (`Jan Ka` — keep or change as desired)

### CI / release verification

- `.github/workflows/release.yml` — uses `$GITHUB_REPOSITORY`, auto-resolves
  after transfer. No edits needed.
- `CONTRIBUTING.md` L153 — hardcoded **cosign identity regex** pins the old
  workflow path:
  `https://github\.com/Jan-Ka/foundryvtt-opend6-space/\.github/workflows/release\.yml@refs/tags/.+`
  Future releases will be signed under the new identity; users following the
  verification doc will fail until this regex is updated. Past tags stay
  signed under the old identity forever — document both if needed.
- `.github/ISSUE_TEMPLATE/config.yml` L7 — security advisory URL
- `SECURITY.md` L18 — security advisory URL

### Docs

- `README.md` L3 (CI badge), L36 (install manifest URL), L56 (wiki link),
  L107 (issues link)
- `CONTRIBUTING.md` L8 (issues link), L153 (cosign — see above)
- `CODE_OF_CONDUCT.md` L41 (`github.com/jan-ka` personal link)
- `CHANGELOG.md` L658 (historical reference — optional)
- `docs/data-loss-recovery.md` L25 (raw script link), L82 (issue #159 link)

### Wiki (separate repo)

The GitHub wiki is its own git repo at
`Jan-Ka/foundryvtt-opend6-space.wiki.git` and is **not** transferred with the
main repo. Local mirror lives in `wiki/`.

- `wiki/README.md` L10 — clone command points at old wiki repo
- `wiki/Home.md` L9, L22, L27, L28, L29 — main repo, manifest, releases,
  changelog, issues
- `wiki/Troubleshooting.md` L24 (manifest), L31 (CONTRIBUTING anchor),
  L76 (issues)

## Phase 2 — GitHub transfer (manual, in browser)

1. Settings → Danger Zone → Transfer ownership → `nonex-ist`.
2. Confirm the redirect from the old URL resolves.
3. Verify org-level access to secrets used by `release.yml` (cosign keys,
   `GITHUB_TOKEN` permissions). If org policy blocks the previous secret
   names, recreate them at the org or repo level before the next tag.
4. Branch protection rules transfer with the repo on org→org moves, but
   verify in the new Settings UI.
5. Re-add any apps/integrations that are user-scoped (Husky doesn't care;
   GitHub Apps installed against `Jan-Ka` org-wide may need reinstall).

## Phase 3 — post-transfer

- Local clone: `git remote set-url origin git@github.com:nonex-ist/foundryvtt-opend6-space.git`
- Wiki migration: create any wiki page on the new repo via UI to initialize
  the wiki git repo, then:
  ```
  git clone https://github.com/Jan-Ka/foundryvtt-opend6-space.wiki.git /tmp/od6s.wiki
  cd /tmp/od6s.wiki
  git remote set-url origin https://github.com/nonex-ist/foundryvtt-opend6-space.wiki.git
  git push
  ```
- Foundry package registry (foundryvtt.com package admin) — update the
  manifest URL to the new path so the public package browser points at the
  new releases.
- Cut a new release. The first signed release under the new identity is
  the validation that cosign verification still works end-to-end.

## What does not need changing

- No `CODEOWNERS`, `FUNDING.yml`, `dependabot.yml`, or GitHub Pages config
  in the repo — nothing hidden there.
- `.github/workflows/release.yml` uses `$GITHUB_REPOSITORY` throughout.
- Discord invite and other external links are org-independent.
- Cross-repo issue/PR references (`#159` etc.) resolve to the new org
  automatically via GitHub's redirect.
