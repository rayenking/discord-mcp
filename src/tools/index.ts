import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { attachmentsModule } from "./attachments.js";
import { channelsModule } from "./channels.js";
import { discoveryModule } from "./discovery.js";
import { dmModule } from "./dm.js";
import { eventsModule } from "./events.js";
import { forumsModule } from "./forums.js";
import { invitesModule } from "./invites.js";
import { membersModule } from "./members.js";
import { messagesModule } from "./messages.js";
import { moderationModule } from "./moderation.js";
import { permissionsModule } from "./permissions.js";
import { rolesModule } from "./roles.js";
import { screeningModule } from "./screening.js";
import { statsModule } from "./stats.js";
import type { ToolModule, ToolDefinition } from "./types.js";
import { webhooksModule } from "./webhooks.js";

const modules: ToolModule[] = [
  messagesModule,
  channelsModule,
  permissionsModule,
  forumsModule,
  membersModule,
  rolesModule,
  moderationModule,
  webhooksModule,
  eventsModule,
  invitesModule,
  discoveryModule,
  statsModule,
  screeningModule,
  dmModule,
  attachmentsModule,
];

export function getAllDefinitions(): ToolDefinition[] {
  return modules.flatMap((m) => m.definitions);
}

export function hasTool(name: string): boolean {
  return modules.some((m) => name in m.handlers);
}

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  for (const mod of modules) {
    const handler = mod.handlers[name];
    if (handler) return handler(args);
  }
  throw new Error(`Unknown tool: ${name}`);
}
