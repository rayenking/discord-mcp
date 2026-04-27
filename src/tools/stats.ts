import { ChannelType } from "discord.js";
import { discord, ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_get_server_stats",
    description:
      "Get server statistics: member count (humans vs bots), channels, roles, boost level.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_get_audit_log",
    description:
      "Fetch the guild audit log (who did what and when).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        limit: {
          type: "number",
          description: "1–100, default 25.",
        },
        action_type: {
          type: "number",
          description: "Optional: filter by Discord action type ID.",
        },
      },
      required: ["guild_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_get_server_stats(args) {
    const guild = await getGuild(args.guild_id as string);
    const fullGuild = await guild.fetch();
    const members = await fullGuild.members.fetch();
    const channels = await fullGuild.channels.fetch();
    const roles = await fullGuild.roles.fetch();

    const humans = members.filter((m) => !m.user.bot).size;
    const bots = members.filter((m) => m.user.bot).size;

    let textChannels = 0;
    let voiceChannels = 0;
    let categories = 0;
    channels.forEach((ch) => {
      if (!ch) return;
      if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) textChannels++;
      else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) voiceChannels++;
      else if (ch.type === ChannelType.GuildCategory) categories++;
    });

    return text({
      guildId: fullGuild.id,
      name: fullGuild.name,
      memberCount: fullGuild.memberCount,
      humans,
      bots,
      channels: {
        total: channels.size,
        text: textChannels,
        voice: voiceChannels,
        categories,
      },
      roles: roles.size,
      premiumTier: fullGuild.premiumTier,
      premiumSubscriptionCount: fullGuild.premiumSubscriptionCount,
      verificationLevel: fullGuild.verificationLevel,
      vanityURLCode: fullGuild.vanityURLCode,
    });
  },

  async discord_get_audit_log(args) {
    const guild = await getGuild(args.guild_id as string);
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);

    const options: import("discord.js").GuildAuditLogsFetchOptions<import("discord.js").AuditLogEvent> = {
      limit,
    };
    if (args.action_type !== undefined) {
      options.type = Number(args.action_type) as import("discord.js").AuditLogEvent;
    }

    const auditLogs = await guild.fetchAuditLogs(options);

    return text(
      auditLogs.entries.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actionType: entry.actionType,
        targetId: entry.targetId,
        executorId: entry.executorId,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
        changes: entry.changes,
      })),
    );
  },
};

export const statsModule: ToolModule = { definitions, handlers };
