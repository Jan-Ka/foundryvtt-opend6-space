#!/usr/bin/env node
/**
 * Wraps the compiled od6s.css in an @layer system block, hoisting any leading
 * @charset / @import statements out of the layer (CSS requires those at the
 * very top of the stylesheet, before any other at-rule).
 */
import {readFileSync, writeFileSync} from "node:fs";

const path = "src/css/od6s.css";
const css = readFileSync(path, "utf8");

const lines = css.split("\n");
const top = [];
const rest = [];
let inTop = true;

for (const line of lines) {
    const trimmed = line.trim();
    if (inTop && (trimmed === "" || trimmed.startsWith("@charset") || trimmed.startsWith("@import"))) {
        top.push(line);
        continue;
    }
    inTop = false;
    rest.push(line);
}

const out = [
    ...top,
    "@layer system {",
    ...rest,
    "}",
    "",
].join("\n");

writeFileSync(path, out, "utf8");
