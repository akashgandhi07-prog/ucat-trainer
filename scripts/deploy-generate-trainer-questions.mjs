#!/usr/bin/env node
/**
 * Bundle and print deploy payload for generate-trainer-questions.
 * Deploy via Cursor MCP: user-supabase-ucat / deploy_edge_function
 * or: SUPABASE_ACCESS_TOKEN=... node scripts/deploy-generate-trainer-questions.mjs --deploy
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(root, "supabase/functions/generate-trainer-questions/index.ts");
const bundleOut = join(root, "supabase/functions/generate-trainer-questions/index.deploy.ts");
const payloadPath = join(root, "scripts/.deploy-generate-payload.json");

const minify = process.argv.includes("--minify");
execSync(
  `npx esbuild "${entry}" --bundle --format=esm --platform=neutral${minify ? " --minify" : ""} --outfile="${bundleOut}"`,
  { stdio: "inherit", cwd: root }
);

const content = readFileSync(bundleOut, "utf8");
const payload = {
  name: "generate-trainer-questions",
  entrypoint_path: "index.ts",
  verify_jwt: true,
  files: [{ name: "index.ts", content }],
};
writeFileSync(payloadPath, JSON.stringify(payload));
console.log(`Bundled ${content.length} bytes → ${payloadPath}`);

if (process.argv.includes("--deploy")) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qhhmcsdteqcuhvdqhkfo";
  if (!token) {
    console.error(
      "Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens, scope: edge_functions write)"
    );
    process.exit(1);
  }
  const metadata = JSON.stringify({
    name: "generate-trainer-questions",
    entrypoint_path: "index.ts",
    verify_jwt: true,
  });
  const form = new FormData();
  form.append("metadata", metadata);
  form.append(
    "file",
    new Blob([content], { type: "application/typescript" }),
    "index.ts"
  );
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=generate-trainer-questions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  const body = await res.text();
  if (!res.ok) {
    console.error(res.status, body);
    process.exit(1);
  }
  console.log("Deployed:", body);
}
