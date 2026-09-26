import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const sitemap = await readFile(path.resolve("dist/sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>https:\/\/ucat\.theukcatpeople\.co\.uk([^<]*)<\/loc>/g)].map((match) => match[1] || "/");
assert.ok(urls.length >= 20, "Generated sitemap unexpectedly lost public pages");
for (const route of urls) {
  const file = route === "/" ? "dist/index.html" : `dist${route}.html`;
  const html = await readFile(path.resolve(file), "utf8");
  assert.match(html, /<title>[^<]+\| TheUKCATPeople<\/title>/, `${route} needs a specific title`);
  assert.match(html, /<meta name="description" content="[^"]+" \/>/, `${route} needs a description`);
  assert.match(html, /<main data-static-seo><h1>[^<]+<\/h1><p>[^<]+<\/p>/, `${route} needs visible static content`);
  assert.ok(html.includes(`<link data-seo-static rel="canonical" href="https://ucat.theukcatpeople.co.uk${route}"`), `${route} needs a matching canonical`);
  assert.match(html, /data-seo-static type="application\/ld\+json"/, `${route} needs matching structured data`);
}
const shell = await readFile(path.resolve("dist/app-shell.html"), "utf8");
assert.ok(!shell.includes("data-seo-static"), "app-shell.html is the SPA fallback and must not carry page-specific SEO tags");
for (const privatePath of ["/study-plan/today", "/study-plan/plan", "/study-plan/reflect", "/dashboard", "/admin", "/tutor"]) {
  assert.ok(!sitemap.includes(`>${privatePath}<`) && !sitemap.includes(`.co.uk${privatePath}<`), `${privatePath} must not be in the sitemap`);
}
console.log(`Static SEO checks passed for ${urls.length} public pages; private application routes are excluded.`);
