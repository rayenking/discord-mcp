import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolDefinition = Tool;

export interface ToolModule {
  definitions: ToolDefinition[];
  handlers: Record<
    string,
    (args: Record<string, unknown>) => Promise<CallToolResult>
  >;
}
