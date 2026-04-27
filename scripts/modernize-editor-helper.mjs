#!/usr/bin/env node
/**
 * One-shot replacement of the v1 {{editor}} helper with the v14 <prose-mirror> element.
 *
 * Matches:
 *   {{ editor X [name=...] target="..." button=true editable=...}}
 * Replaces with:
 *   <prose-mirror name="..." value="{{X}}" {{#unless editable}}disabled{{/unless}}></prose-mirror>
 *
 * The first positional arg is the value expression (e.g. item.system.description).
 * The optional `name=` is a v1 oddity duplicating the value path; ignored.
 * `target` becomes the prose-mirror element's `name` attribute (form field path).
 *
 * Run: node scripts/modernize-editor-helper.mjs
 */

import {readFileSync, writeFileSync, statSync, readdirSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../src/templates");

function* walk(dir) {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const s = statSync(path);
        if (s.isDirectory()) yield* walk(path);
        else if (entry.endsWith(".html")) yield path;
    }
}

const editorRe = /\{\{\s*editor\s+([^\s}]+)(?:\s+name=[^\s}]+)?\s+target=("[^"]+")\s+button=true\s+editable=\w+\s*\}\}/g;

let total = 0;
let filesChanged = 0;

for (const path of walk(root)) {
    const original = readFileSync(path, "utf8");
    let perFile = 0;

    const updated = original.replace(editorRe, (_m, value, target) => {
        perFile++;
        return `<prose-mirror name=${target} value="{{${value}}}" {{#unless editable}}disabled{{/unless}}></prose-mirror>`;
    });

    if (updated !== original) {
        writeFileSync(path, updated);
        filesChanged++;
        total += perFile;
        console.log(`${path}: ${perFile} {{editor}}`);
    }
}

console.log(`\nTotal: ${total} {{editor}} replacements across ${filesChanged} files.`);
