#!/usr/bin/env node
/**
 * Reads deploy payload and prints JSON args for MCP deploy_edge_function.
 * Usage: node scripts/run-mcp-deploy-generate.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = join(root, "scripts/.deploy-generate-payload.json");
const payload = JSON.parse(readFileSync(payloadPath, "utf8"));

const args = {
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: true,
  files: payload.files,
};

const content = args.files?.[0]?.content ?? "";
if (!content || content.length < 1000) {
  console.error("ABORT: bundle empty or too small");
  process.exit(1);
}
if (content === "PLACEHOLDER") {
  console.error("ABORT: placeholder content");
  process.exit(1);
}

process.stdout.write(JSON.stringify(args));
