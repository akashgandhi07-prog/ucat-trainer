#!/usr/bin/env node
/**
 * Removes tsconfig include paths containing ".next-ci-" (written when NEXT_CI_DIST_DIR is set).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const path = join(root, "tsconfig.json");
const raw = readFileSync(path, "utf8");
const j = JSON.parse(raw);
if (!Array.isArray(j.include)) process.exit(0);
const next = j.include.filter((e) => !String(e).includes(".next-ci-"));
if (next.length === j.include.length) process.exit(0);
j.include = next;
writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`);
