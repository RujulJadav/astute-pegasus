// Fails if any colour outside the Astute palette appears in the source or the built pages.
// Allowed: the 13 brand hex values (any case, with or without an alpha byte), #000/#fff,
// transparent/currentColor, and color-mix() tints that Tailwind generates from them.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BRAND = ["0B89A1", "00C6FF", "003C51", "F2E8C4", "E6F4F1", "000000", "6D6E71", "BCBDC0", "F6F6F6", "FFFFFF", "FA9137", "FDD8B9", "FBB273"];
const ok = (hex) => {
  let h = hex.slice(1).toUpperCase();
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("") + (h.length === 4 ? h[3] + h[3] : "");
  return BRAND.includes(h.slice(0, 6));
};
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// the source, plus the built app's CSS (npm run build) when it exists
const built = (() => { try { return walk("../pegasus_cloud/static/next").filter((f) => f.endsWith(".css")); } catch { return []; } })();
const files = [...walk("src"), ...built];

let bad = 0;
for (const f of files) {
  let text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const len = m[0].length - 1;
    if (![3, 4, 6, 8].includes(len)) continue;
    if (!ok(m[0])) { bad++; console.log(`${f}: off-brand ${m[0]}`); }
  }
  for (const m of text.matchAll(/\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(\s*[\d.]/g)) {
    bad++; console.log(`${f}: raw colour function ${m[0]}…`);
  }
}
console.log(bad ? `\n${bad} off-brand colour(s)` : `brand-lint: ${files.length} files, every colour is from the Astute palette`);
process.exit(bad ? 1 : 0);
