import { getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_kick_member",
    description: "Kick a member from a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id"],
    },
  },
  {
    name: "discord_ban_member",
    description: "Ban a member from a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        reason: { type: "string", description: "Audit log reason." },
        delete_message_days: {
          type: "number",
          description: "Delete messages from last N days (0–7).",
        },
      },
      required: ["guild_id", "user_id"],
    },
  },
  {
    name: "discord_unban_member",
    description: "Unban a user from a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id"],
    },
  },
  {
    name: "discord_timeout_member",
    description:
      "Put a member in timeout (0 minutes to remove the timeout).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        duration_minutes: {
          type: "number",
          description: "Timeout duration in minutes. 0 to remove timeout.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id", "duration_minutes"],
    },
  },
  {
    name: "discord_list_bans",
    description: "List all banned users in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        limit: {
          type: "number",
          description: "Max bans to fetch.",
        },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_bulk_ban",
    description: "Ban multiple users at once (raid mitigation).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of user IDs to ban.",
        },
        reason: { type: "string", description: "Audit log reason." },
        delete_message_seconds: {
          type: "number",
          description: "Delete messages from last N seconds (0–604800).",
        },
      },
      required: ["guild_id", "user_ids"],
    },
  },
  {
    name: "discord_prune_members",
    description:
      "Remove inactive members. Use dry_run (default) to preview count first.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        days: {
          type: "number",
          description: "Number of days of inactivity (1–30).",
        },
        dry_run: {
          type: "boolean",
          description:
            "If true (default), only returns count without pruning.",
        },
        roles: {
          type: "array",
          items: { type: "string" },
          description: "Role IDs to include in the prune.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "days"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_kick_member(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    await member.kick(args.reason as string | undefined);
    return text({
      success: true,
      kickedUserId: args.user_id,
    });
  },

  async discord_ban_member(args) {
    const guild = await getGuild(args.guild_id as string);
    const days = Math.min(Math.max(Number(args.delete_message_days) || 0, 0), 7);
    await guild.members.ban(args.user_id as string, {
      reason: args.reason as string | undefined,
      deleteMessageSeconds: days * 86400,
    });
    return text({
      success: true,
      bannedUserId: args.user_id,
      deleteMessageDays: days,
    });
  },

  async discord_unban_member(args) {
    const guild = await getGuild(args.guild_id as string);
    await guild.members.unban(
      args.user_id as string,
      args.reason as string | undefined,
    );
    return text({
      success: true,
      unbannedUserId: args.user_id,
    });
  },

  async discord_timeout_member(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    const minutes = Number(args.duration_minutes);
    const timeout = minutes > 0 ? minutes * 60 * 1000 : null;
    await member.timeout(timeout, args.reason as string | undefined);
    return text({
      success: true,
      userId: args.user_id,
      timeoutUntil: minutes > 0
        ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
        : null,
    });
  },

  async discord_list_bans(args) {
    const guild = await getGuild(args.guild_id as string);
    const limit = args.limit ? Math.max(Number(args.limit), 1) : undefined;
    const bans = await guild.bans.fetch({ limit });
    return text(
      bans.map((ban) => ({
        userId: ban.user.id,
        username: ban.user.username,
        reason: ban.reason,
      })),
    );
  },

  async discord_bulk_ban(args) {
    const guild = await getGuild(args.guild_id as string);
    const userIds = args.user_ids as string[];
    const deleteMessageSeconds = Math.min(
      Math.max(Number(args.delete_message_seconds) || 0, 0),
      604800,
    );

    const result = await guild.members.bulkBan(userIds, {
      reason: args.reason as string | undefined,
      deleteMessageSeconds,
    });

    return text({
      bannedUsers: result.bannedUsers.map((u) => u.toString()),
      failedUsers: result.failedUsers.map((u) => u.toString()),
    });
  },

  async discord_prune_members(args) {
    const guild = await getGuild(args.guild_id as string);
    const days = Math.min(Math.max(Number(args.days), 1), 30);
    const dryRun = args.dry_run !== false;
    const roles = args.roles as string[] | undefined;

    if (dryRun) {
      const count = await guild.members.prune({
        days,
        dry: true,
        roles: roles ?? [],
        reason: args.reason as string | undefined,
      });
      return text({ dryRun: true, wouldPrune: count });
    }

    const pruned = await guild.members.prune({
      days,
      dry: false,
      roles: roles ?? [],
      reason: args.reason as string | undefined,
    });
    return text({ dryRun: false, pruned });
  },
};

export const moderationModule: ToolModule = { definitions, handlers };
