#!/usr/bin/env node
/**
 * Deploy full bundle via Supabase MCP HTTP (uses Cursor OAuth session when run in agent).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = join(root, "scripts/.deploy-generate-payload.json");
const args = JSON.parse(readFileSync(payloadPath, "utf8"));
const c = args.files[0].content;
if (c.length < 50000 || !c.includes("Deno.serve") || /PLACEHOLDER/i.test(c)) {
  console.error("Invalid bundle", c.length, c.slice(0, 40));
  process.exit(1);
}

const url = "https://mcp.supabase.com/mcp?project_ref=qhhmcsdteqcuhvdqhkfo";
const transport = new StreamableHTTPClientTransport(new URL(url));
const client = new Client({ name: "mcp-deploy-full", version: "1.0.0" });
await client.connect(transport);
const result = await client.callTool({ name: "deploy_edge_function", arguments: args });
console.log(JSON.stringify(result, null, 2));
await client.close();
