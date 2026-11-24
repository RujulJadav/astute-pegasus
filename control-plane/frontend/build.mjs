// npm run build:demo — the design demo as one self-contained HTML file in dist/demo/ (sample data, works offline).
import { build } from "vite";
import { statSync } from "node:fs";

process.env.DEMO = "1";
await build({ logLevel: "warn" });
const out = "dist/demo/concept-a.html";
console.log(`${out}  ${(statSync(out).size / 1024).toFixed(0)} KB  (open it directly; add ?demo when serving it over http)`);
