#!/usr/bin/env node
/**
 * Fails CI or local runs if a migration appears to break trainer-critical tables.
 * Complements RLS: server routes must still scope plan_id; this guards the drill schema.
 *
 * Scans all .sql files under supabase/migrations recursively.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

/** Whole-table drops / truncates on trainer spine. */
const TABLE_DESTRUCTION = [
  {
    name: "drop trainer sessions table",
    re: /drop\s+table(\s+if\s+exists)?\s+public\.sessions\b/i,
  },
  {
    name: "drop profiles table",
    re: /drop\s+table(\s+if\s+exists)?\s+public\.profiles\b/i,
  },
  {
    name: "truncate trainer sessions",
    re: /\btruncate\s+((only|table)\s+)?public\.sessions\b/i,
  },
  {
    name: "truncate profiles",
    re: /\btruncate\s+((only|table)\s+)?public\.profiles\b/i,
  },
];

/** Narrowing trainer sessions / profiles without a reviewer override is easy to ship by mistake. */
const DROP_COLUMN = [
  {
    name: "drop column on public.sessions",
    re: /alter\s+table\s+public\.sessions\b[\s\S]{0,2000}?drop\s+column/is,
  },
  {
    name: "drop column on public.profiles",
    re: /alter\s+table\s+public\.profiles\b[\s\S]{0,2000}?drop\s+column/is,
  },
];

/** Table renames off the canonical drill table name break the Vite app and analytics. */
const RENAME_OFF_SESSIONS = [
  {
    name: "rename public.sessions",
    re: /\balter\s+table\s+public\.sessions\b[\s\S]{0,500}?rename\s+to\b/is,
  },
];

async function collectSqlFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    console.warn("check-migrations-trainer-safe: no migrations dir at", dir);
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectSqlFiles(p)));
    else if (e.isFile() && e.name.endsWith(".sql")) out.push(p);
  }
  return out;
}

async function main() {
  const files = (await collectSqlFiles(MIGRATIONS_DIR)).sort();
  if (files.length === 0) {
    console.log("check-migrations-trainer-safe: no SQL files found, ok.");
    process.exit(0);
  }

  const failures = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const text = await fs.readFile(file, "utf8");

    for (const { name, re } of [...TABLE_DESTRUCTION, ...DROP_COLUMN, ...RENAME_OFF_SESSIONS]) {
      if (re.test(text)) {
        failures.push({ rel, rule: name });
      }
    }
  }

  if (failures.length) {
    console.error("check-migrations-trainer-safe: blocked patterns for trainer-critical schema.\n");
    for (const f of failures) {
      console.error(`  ${f.rel}\n    rule: ${f.rule}\n`);
    }
    console.error(
      "If this change is intentional and trainer-compatible, split it into a reviewed migration\n" +
        "with additive / default-backed columns, or discuss renaming drill sessions in a dedicated release.\n",
    );
    process.exit(1);
  }

  console.log(`check-migrations-trainer-safe: ok (${files.length} files under supabase/migrations).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
