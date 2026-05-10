<!-- markdownlint-disable MD013 -->
# Character data-loss recovery (issue #159)

If a character's biography fields appear blank after editing the name +
biography in the same session, follow this runbook. Read it end to end
before doing anything — the wrong order can overwrite recoverable data.

## 1. Stop editing the affected actor immediately

Every save on the actor's sheet may overwrite the last-good copy in
Foundry's database. Close the sheet and don't reopen it until you've
captured a backup.

## 2. Capture a snapshot from the live world

Open Foundry's developer console (F12) and paste the contents of
[`scripts/check-character-data-loss.console.js`](../scripts/check-character-data-loss.console.js).
You'll get a `window.od6sRecovery` namespace.

```js
od6sRecovery.audit()              // identify suspect actors (read-only)
copy(od6sRecovery.dumpAll())      // copy a full JSON backup to clipboard
od6sRecovery.dump("Actor Name")   // single-actor JSON
```

Save the clipboard contents to a file before going further. The audit
flags actors as suspect when **all three** biography HTMLFields
(`description`, `personality`, `background`) are empty AND the character
shows signs of use (character points, fate points, items, or any
attribute base above 0). It also reports `_stats.modifiedTime` and
`lastModifiedBy` so you can correlate against when the report came in.

False positives: a brand-new untouched character with an empty bio will
look "suspect" if it has a single item attached. Treat the audit as a
shortlist, not a verdict.

## 3. Recover from a Foundry world backup

Foundry's world data lives at `Data/worlds/<world-id>/`. The actor
collection is the LevelDB pack at `Data/worlds/<world-id>/data/actors/`.
If you have:

- **A Foundry-managed backup** (Setup → Backup Manager): restore the
  world from the snapshot taken before the data loss.
- **A filesystem snapshot** (your own backup, Time Machine, container
  volume snapshot, etc.): stop Foundry, replace the `actors/` pack, then
  restart.

After restoring, re-run `od6sRecovery.audit()` to confirm the suspect
list is empty (or limited to genuinely new characters).

## 4. Targeted single-actor restore

If you only want to restore one actor and you have a previous JSON dump
(from `od6sRecovery.dump(...)` or an earlier `dumpAll`):

```js
od6sRecovery.restore("ACTOR_ID", "{ ...json... }")
```

GM-only. Prompts for confirmation. Replaces name, image, system data,
and embedded items in place — keeps the actor id stable so token
references survive.

## 5. Prevent further losses

Until the underlying bug (issue #159) is resolved:

- Make name changes and biography edits in **separate save cycles**.
  Change the name → click outside → wait for the save to complete →
  then edit the biography. Don't have multiple bio editors open at once.
- Take a `dumpAll()` snapshot before any session where you'll be making
  bulk edits to character sheets.

## 6. Reporting

If you hit this, please add to issue #159:

- Foundry version (Settings → About).
- System version.
- The order of operations that triggered it (name first then bio, or
  bio first then name).
- Whether numeric fields (CP, FP, attributes) were also reset, or only
  biography text.
