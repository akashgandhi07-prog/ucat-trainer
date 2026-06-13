#!/usr/bin/env node
/**
 * Deploy generate-trainer-questions via Supabase Management API.
 * Requires: SUPABASE_ACCESS_TOKEN (dashboard account token, edge_functions write)
 * Usage: SUPABASE_ACCESS_TOKEN=... node scripts/deploy-edge-with-token.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = join(root, "scripts/.deploy-generate-payload.json");
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qhhmcsdteqcuhvdqhkfo";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)"
  );
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
const content = payload.files[0].content;
if (content.length < 50000 || !content.includes("Deno.serve") || /PLACEHOLDER/i.test(content)) {
  console.error("Invalid bundle. Run: node scripts/deploy-generate-trainer-questions.mjs --minify");
  process.exit(1);
}

const metadata = JSON.stringify({
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
});
const form = new FormData();
form.append("metadata", metadata);
form.append("file", new Blob([content], { type: "application/typescript" }), "index.ts");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=generate-trainer-questions`,
  { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
);
const body = await res.text();
if (!res.ok) {
  console.error(res.status, body);
  process.exit(1);
}
console.log("Deployed:", body);
