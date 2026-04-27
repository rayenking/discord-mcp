#!/usr/bin/env node

import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ensureConnected } from "./client.js";
import { getAllDefinitions, hasTool, handleTool } from "./tools/index.js";

const TOOLS_WITHOUT_DISCORD_CONNECTION = new Set(["discord_download_attachment"]);

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const server = new Server(
  { name: "rayenking-discord-mcp", version },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getAllDefinitions(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (!hasTool(name)) {
      return {
        content: [{ type: "text" as const, text: `Error: Unknown tool: ${name}` }],
        isError: true,
      };
    }
    if (!TOOLS_WITHOUT_DISCORD_CONNECTION.has(name)) {
      await ensureConnected();
    }
    return await handleTool(name, args ?? {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  await ensureConnected();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("rayenking-discord-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
