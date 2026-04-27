#!/usr/bin/env node
// One-shot codemod: drop ".js" extensions from TS-to-TS relative imports.
// Run once with `node scripts/strip-js-extensions.mjs`; safe to re-run (idempotent).
//
// Scope: src/module/**/*.ts only. Skips src/lib/ (vendored .js), tests, scripts.
// Rewrites both single- and double-quoted relative imports/exports/side-effect imports.

import {readFileSync, writeFileSync} from "node:fs";
import {globSync} from "node:fs";

const files = globSync("src/module/**/*.ts");

const importRe = /(from\s+['"]|import\s+['"])(\.\.?\/[^'"]+?)\.js(['"])/g;

let totalLines = 0;
let touchedFiles = 0;
for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = before.replace(importRe, "$1$2$3");
    if (after !== before) {
        writeFileSync(file, after);
        const matches = before.match(importRe) ?? [];
        totalLines += matches.length;
        touchedFiles++;
    }
}

console.log(`Rewrote ${totalLines} import lines across ${touchedFiles} file(s).`);
