#!/usr/bin/env node
/**
 * #13 Phase 2 codemod: switch actor-side handlebars templates from
 * `<thing>.system.score` to `<thing>.system.total` for display contexts.
 *
 * Skipped:
 * - src/templates/item/item-skill-sheet.html
 * - src/templates/item/item-specialization-sheet.html
 *   (item edit forms — no actor context, `total` is undefined for unowned items)
 */

import {readFileSync, writeFileSync} from 'node:fs';

const TARGETS = [
    'src/templates/actor/common/tabs/attribute-column.html',
    'src/templates/actor/character/tabs/attributes.html',
    'src/templates/actor/character/tabs/metaphysics.html',
    'src/templates/metaphysicsRoll.html',
    'src/templates/actor/character/create-skill-column.html',
    'src/templates/actor/character/create-character-skills.html',
];

let totalReplacements = 0;
for (const file of TARGETS) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(/\.system\.score\b/g, '.system.total');
    const count = (before.match(/\.system\.score\b/g) ?? []).length;
    if (count > 0) {
        writeFileSync(file, after);
        console.log(`${file}: ${count} replacement(s)`);
        totalReplacements += count;
    }
}
console.log(`\nTotal: ${totalReplacements}`);
