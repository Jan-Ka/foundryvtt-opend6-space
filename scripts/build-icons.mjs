/**
 * Extracts specific icons from @iconify-json/game-icons and writes them
 * as SVG files into src/icons/. Run via `pnpm run build:icons`.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = join(ROOT, "src", "icons");

// Maps output filename (without extension) → game-icons icon name.
// The `*-default.svg` entries back the per-item-type defaults consumed by
// `sheet-helpers/prepare-items.ts`; filename matches `<item.type>-default`
// so the helper can resolve the path with a single string concat instead
// of a separate lookup table. Sci-fi/space-themed picks for OpenD6 Space.
const ICON_MAP = {
  "wounded":          "bleeding-wound",
  "severely-wounded": "large-wound",
  "incapacitated":    "broken-bone",
  "mortally-wounded": "skull-crack",
  "skull-shield":     "skull-shield",
  "eclipse-flare":    "eclipse-flare",

  "weapon-default":             "ray-gun",
  "armor-default":              "space-suit",
  "gear-default":               "backpack",
  "skill-default":              "brain",
  "specialization-default":     "star-medal",
  "action-default":             "reticule",
  "advantage-default":          "overdrive",
  "disadvantage-default":       "heart-minus",
  "specialability-default":     "third-eye",
  "cybernetic-default":         "cyborg-face",
  "manifestation-default":      "brain-tentacle",
  "vehicle-weapon-default":     "laser-warning",
  "vehicle-gear-default":       "toolbox",
  "starship-weapon-default":    "plasma-bolt",
  "starship-gear-default":      "cargo-ship",
  "character-template-default": "astronaut-helmet",
  "species-template-default":   "dna2",
  "item-group-default":         "swap-bag",
};

const packagePath = join(ROOT, "node_modules", "@iconify-json", "game-icons", "icons.json");
const { icons, width: defaultWidth, height: defaultHeight } = JSON.parse(readFileSync(packagePath, "utf8"));

for (const [filename, iconName] of Object.entries(ICON_MAP)) {
  const icon = icons[iconName];
  if (!icon) {
    console.error(`✗ Icon not found in game-icons: ${iconName}`);
    process.exit(1);
  }
  const w = icon.width ?? defaultWidth;
  const h = icon.height ?? defaultHeight;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>\n`;
  const outPath = join(ICONS_DIR, `${filename}.svg`);
  writeFileSync(outPath, svg);
  console.log(`✓ ${filename}.svg  ←  ${iconName}`);
}
