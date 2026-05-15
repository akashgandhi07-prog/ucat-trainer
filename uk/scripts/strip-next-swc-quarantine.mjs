#!/usr/bin/env node
/**
 * macOS may quarantine the prebuilt @next/swc native binary after npm install,
 * causing "library load disallowed by system policy". Safe no-op on non-macOS.
 */
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// Rare npm tar edge case: folder exists but package.json is missing → eslint-config-next breaks.
const babelPackagesDir = join(root, "node_modules", "next", "dist", "compiled", "babel-packages");
const babelPackagesPkg = join(babelPackagesDir, "package.json");
const babelPackagesBundle = join(babelPackagesDir, "packages-bundle.js");
if (existsSync(babelPackagesBundle) && !existsSync(babelPackagesPkg)) {
  writeFileSync(
    babelPackagesPkg,
    `${JSON.stringify({ name: "babel-packages", main: "./packages-bundle.js" })}\n`,
  );
}

if (process.platform !== "darwin") process.exit(0);

function clearXattr(dir) {
  if (!existsSync(dir)) return;
  try {
    execSync(`xattr -cr "${dir}"`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

const nm = join(root, "node_modules");
clearXattr(join(nm, "@next"));
clearXattr(join(nm, "next"));

// Some macOS builds reject the prebuilt SWC dylib until ad-hoc re-sign (dev machines / nested repos).
const nextScoped = join(nm, "@next");
if (existsSync(nextScoped)) {
  for (const name of readdirSync(nextScoped)) {
    if (!name.startsWith("swc-darwin-")) continue;
    const dir = join(nextScoped, name);
    let files;
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".node")) continue;
      const swcNode = join(dir, f);
      try {
        execSync(`codesign --force --sign - "${swcNode}"`, { stdio: "ignore" });
      } catch {
        /* ignore — codesign may be unavailable in minimal CI images */
      }
    }
  }
}
