import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const manifest = JSON.parse(await readFile(path.join(dist, ".vite/manifest.json"), "utf8"));
const entry = manifest["index.html"];
assert.ok(entry?.isEntry, "Vite manifest is missing the index entry; run the production build first");

const initial = new Set();
function collect(item) {
  if (!item || initial.has(item.file)) return;
  initial.add(item.file);
  for (const imported of item.imports ?? []) collect(manifest[imported]);
}
collect(entry);

async function size(file) {
  const body = await readFile(path.join(dist, file));
  return { raw: body.byteLength, gzip: gzipSync(body).byteLength };
}
const entrySize = await size(entry.file);
const initialSizes = await Promise.all([...initial].map(size));
const initialRaw = initialSizes.reduce((sum, item) => sum + item.raw, 0);
const initialGzip = initialSizes.reduce((sum, item) => sum + item.gzip, 0);
const cssSizes = await Promise.all((entry.css ?? []).map(size));
const cssRaw = cssSizes.reduce((sum, item) => sum + item.raw, 0);

const budgets = {
  entryRaw: 260 * 1024,
  initialRaw: 825 * 1024,
  initialGzip: 235 * 1024,
  cssRaw: 135 * 1024,
};
assert.ok(entrySize.raw <= budgets.entryRaw, `Entry JavaScript ${entrySize.raw} bytes exceeds ${budgets.entryRaw}`);
assert.ok(initialRaw <= budgets.initialRaw, `Initial JavaScript ${initialRaw} bytes exceeds ${budgets.initialRaw}`);
assert.ok(initialGzip <= budgets.initialGzip, `Initial gzipped JavaScript ${initialGzip} bytes exceeds ${budgets.initialGzip}`);
assert.ok(cssRaw <= budgets.cssRaw, `Initial CSS ${cssRaw} bytes exceeds ${budgets.cssRaw}`);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
console.log(`Bundle budget passed: entry ${kb(entrySize.raw)}, initial JS ${kb(initialRaw)} raw/${kb(initialGzip)} gzip, CSS ${kb(cssRaw)}.`);
