<!-- markdownlint-disable MD013 -->
# Recovering a character with a blanked-out sheet

If a player's character sheet suddenly looks empty after they edited the
name and biography in the same sitting, this guide walks you through
checking what was lost and getting their character back.

You'll need to be the GM. Read the whole page once before starting —
doing the steps in the wrong order can make things worse.

## 1. Stop editing the character

Tell the player to close the sheet and not reopen it. Every save can
overwrite what's still recoverable. If a token for the character is on
the canvas, that's fine; just don't open the sheet.

## 2. Make a safety copy

Before changing anything, take a snapshot of the world's characters so
you can compare or restore later.

1. In the Foundry browser tab, press **F12** to open the developer
   tools, then click the **Console** tab.
2. Open the script
   [`scripts/check-character-data-loss.console.js`](https://github.com/nonex-ist/foundryvtt-opend6-space/blob/main/scripts/check-character-data-loss.console.js)
   on GitHub, copy its full contents, paste into the Console, press
   **Enter**.
3. Type `od6sRecovery.audit()` and press **Enter**. You'll see a table
   listing every character. The "suspect" column flags characters whose
   biography is empty but who otherwise look like they've been played
   (have items, character points, etc).
4. Type `copy(od6sRecovery.dumpAll())` and press **Enter**. This puts a
   full backup of every character on your clipboard. Paste it into a
   text file and save it somewhere safe (e.g. `od6s-backup.json`).

The script doesn't change anything by itself — it just reads.

## 3. Restore from a Foundry world backup (best path)

If you have a backup of the world from before the problem happened, use
it. Foundry's built-in backups are the easiest:

1. Quit out of the world (top-right menu → **Return to Setup**).
2. From the Setup screen, click your world → **Manage Backups**.
3. Pick a backup taken before the loss and restore it.
4. Re-launch the world and check the affected character.

If you keep your own backups (Time Machine, a daily folder copy, your
hosting provider's snapshots), restoring the whole world folder works
the same way — make sure Foundry isn't running while you copy files
back, then restart it.

## 4. Restore just one character (only if you have an old snapshot)

If you previously saved a character's data using `od6sRecovery.dump(...)`
or `dumpAll()`, you can put that single character back without rolling
the whole world back. As GM, in the Console:

```js
od6sRecovery.restore("ACTOR_ID", "PASTE_THE_JSON_STRING_HERE")
```

Replace `ACTOR_ID` with the character's id (the audit table shows it).
Confirm the prompt that appears. The character keeps the same id, so
their token, journal links, and chat history stay connected.

If you don't have an earlier snapshot, you can't recover from the
console — only a world backup will help.

## 5. Until the bug is fixed, work around it

- Make name changes and biography edits **separately**. Change the
  name, click somewhere else on the sheet, wait a moment, then open the
  biography section.
- Don't have the same character open in multiple windows.
- Before any session where you'll be doing a lot of sheet edits, run
  `copy(od6sRecovery.dumpAll())` and save the result. Five seconds of
  prep buys you a one-step recovery if anything goes wrong.

## 6. Help us fix it

Please add to [issue #159](https://github.com/nonex-ist/foundryvtt-opend6-space/issues/159):

- Your Foundry version (Setup screen, top-right "About").
- The OpenD6 Space system version (same place).
- What you were doing right before the sheet blanked out — did you
  change the name first or the biography first?
- Did anything else look wrong (character points, attributes, items),
  or only the biography text?
