#!/usr/bin/env node
/**
 * Reads /tmp/final-mcp-deploy.json (65396-byte bundle) and prints deploy args JSON to stdout.
 * Use with MCP deploy_edge_function by passing the parsed object from this output.
 */
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/final-mcp-deploy.json";
const payload = JSON.parse(readFileSync(path, "utf8"));
const c = payload.files[0].content;
process.stderr.write(
  JSON.stringify({
    contentLength: c.length,
    hasDenoServe: c.includes("Deno.serve"),
    hasGenerate: c.includes("generateAndVerifyQuestions"),
    hasPlaceholder: /PLACEHOLDER/i.test(c),
  }) + "\n"
);
process.stdout.write(JSON.stringify(payload));
