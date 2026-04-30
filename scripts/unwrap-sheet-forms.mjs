#!/usr/bin/env node
/**
 * One-shot fix for issue #27 — sheet edits not persisting.
 *
 * Foundry v14 DocumentSheetV2 / ItemSheetV2 already render the application
 * root as a <form> (tag: "form"). Each actor/item sheet template wrapped its
 * content in another <form>, producing nested <form><form>...</form></form>.
 * Browsers drop the inner form during HTML parsing, so submitOnChange misses
 * fields unpredictably (actor name, metaphysics toggle, item name, weapon
 * range, etc.).
 *
 * This script swaps the outer <form ...> wrapper for a <div ...> in:
 *   - src/templates/actor/common/actor-sheet.html
 *   - src/templates/item/item-*-sheet.html
 *
 * Run once: node scripts/unwrap-sheet-forms.mjs
 */

import {readFileSync, writeFileSync, readdirSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const files = [
    join(root, "src/templates/actor/common/actor-sheet.html"),
    ...readdirSync(join(root, "src/templates/item"))
        .filter((n) => /^item-.*-sheet\.html$/.test(n))
        .map((n) => join(root, "src/templates/item", n)),
];

const OPEN_RE = /^<form(\s+class="[^"]*")?\s+autocomplete="off">\s*$/;

let changed = 0;
for (const file of files) {
    const original = readFileSync(file, "utf8");
    const lines = original.split("\n");
    if (!OPEN_RE.test(lines[0])) {
        console.warn(`skip (unexpected first line): ${file}`);
        continue;
    }
    const classMatch = lines[0].match(/class="([^"]*)"/);
    lines[0] = classMatch ? `<div class="${classMatch[1]}">` : "<div>";

    let lastFormIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("</form>")) { lastFormIdx = i; break; }
    }
    if (lastFormIdx === -1) {
        console.warn(`skip (no </form>): ${file}`);
        continue;
    }
    lines[lastFormIdx] = lines[lastFormIdx].replace("</form>", "</div>");

    const next = lines.join("\n");
    if (next !== original) {
        writeFileSync(file, next);
        changed++;
        console.log(`updated: ${file.replace(root + "/", "")}`);
    }
}
console.log(`\n${changed} file(s) updated.`);
