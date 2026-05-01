# Troubleshooting

## Installing a PR preview build

PRs to this repository attach a built `od6s.zip` artifact to each push. The
PR comment includes a link to the artifact. Foundry's **Install System →
Manifest URL** flow does **not** work for PR previews — artifacts require a
logged-in GitHub download — so manual extraction is the only path.

1. **Back up your world** before testing a preview. Preview builds carry a
   `0.0.0-prN+sha` version stamp; they are not intended for live play.
2. Sign in to GitHub and download the artifact zip from the PR comment.
3. Unzip it. Inside you will find `od6s.zip` and a `.sha256` checksum.
4. Quit Foundry. Locate your Foundry user data folder, then `Data/systems/`.
   - If `od6s` already exists, rename or remove it first — the preview will
     replace it.
5. Extract `od6s.zip` into `Data/systems/` so you end up with
   `Data/systems/od6s/system.json`.
6. Start Foundry. The system will appear as **OpenD6 Space** with the
   stamped preview version.

To roll back, delete `Data/systems/od6s/` and reinstall the stable manifest
URL from
<https://github.com/Jan-Ka/foundryvtt-opend6-space/releases/latest/download/system.json>.

## Verifying a stable release

Tagged releases are signed with [cosign](https://docs.sigstore.dev/) keyless
signing and ship a CycloneDX SBOM (`sbom.cdx.json`) and a SHA-256 checksum
(`od6s.zip.sha256`). The verify command lives in
[CONTRIBUTING.md](https://github.com/Jan-Ka/foundryvtt-opend6-space/blob/main/CONTRIBUTING.md#verifying-a-release).

## "socketlib is not active"

OpenD6 Space requires the [socketlib](https://foundryvtt.com/packages/socketlib)
module. Install it from Foundry's module browser, then enable it in your
world's module list. Vehicle crew sync, opposed-roll queueing, and a few
other features depend on socketlib being active for *all* connected clients.

## A setting change has no effect

Some toggles under **Rules Options** require a world reload to take effect.
Reload the browser tab after changing them. If a change still appears
inert, file an issue with:

- the setting name (or a screenshot),
- system version (System Settings → top of page),
- Foundry version,
- whether socketlib is active.

## Reporting bugs

Issues live at
<https://github.com/Jan-Ka/foundryvtt-opend6-space/issues>. Please include
system + Foundry versions, a brief reproduction, and any errors from the
browser console (F12).
