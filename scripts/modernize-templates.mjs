#!/usr/bin/env node
/**
 * One-shot template modernization helper used during the v14 ApplicationV2 migration.
 *
 * Walks src/templates/**.html and converts deprecated v1 helpers:
 *   - {{checked X}}        → {{#if X}}checked{{/if}}
 *   - {{#select X}} ... {{/select}}  → unwrap, injecting `{{#if (eq val X)}}selected{{/if}}`
 *     onto any <option value="..."> that doesn't already have a selection conditional
 *
 * The {{editor}} helper is not auto-converted (only one occurrence; needs ProseMirror element).
 *
 * Run: node scripts/modernize-templates.mjs
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

function rewriteSelectBlock(selVar, inner) {
    // If the inner content already contains "selected" anywhere, the per-option
    // conditional is already in place (typical of {{#each}} loops). Just unwrap.
    if (/selected/.test(inner)) return inner;

    // Otherwise, this is a static option list. Inject a conditional onto each
    // <option value="..."> tag.
    return inner.replace(/<option\s+value=(["'])([^"']+)\1/g, (_m, quote, val) => {
        // val is either a literal string ("normal", "freeedit") or a handlebars
        // expression like "{{key}}". Compare it appropriately to selVar.
        const isExpr = val.startsWith("{{") && val.endsWith("}}");
        const lhs = isExpr ? val.slice(2, -2).trim() : `${quote}${val}${quote}`;
        return `<option value=${quote}${val}${quote} {{#if (eq ${lhs} ${selVar})}}selected{{/if}}`;
    });
}

let totalChecked = 0;
let totalSelect = 0;
let filesChanged = 0;

for (const path of walk(root)) {
    const original = readFileSync(path, "utf8");
    let perFileChecked = 0;
    let perFileSelect = 0;

    let updated = original.replace(/\{\{checked\s+([^}]+?)\}\}/g, (_m, expr) => {
        perFileChecked++;
        return `{{#if ${expr.trim()}}}checked{{/if}}`;
    });

    updated = updated.replace(/\{\{#select\s+([^}]+?)\}\}([\s\S]*?)\{\{\/select\}\}/g, (_m, selVar, inner) => {
        perFileSelect++;
        return rewriteSelectBlock(selVar.trim(), inner);
    });

    if (updated !== original) {
        writeFileSync(path, updated);
        filesChanged++;
        totalChecked += perFileChecked;
        totalSelect += perFileSelect;
        const parts = [];
        if (perFileChecked) parts.push(`${perFileChecked} {{checked}}`);
        if (perFileSelect) parts.push(`${perFileSelect} {{#select}}`);
        console.log(`${path}: ${parts.join(", ")}`);
    }
}

console.log(`\nTotal: ${totalChecked} {{checked}} + ${totalSelect} {{#select}} replacements across ${filesChanged} files.`);
