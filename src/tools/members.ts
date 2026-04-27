import { ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeMember(member: import("discord.js").GuildMember) {
  return {
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    nickname: member.nickname,
    bot: member.user.bot,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    roles: member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
  };
}

function serializeMemberDetailed(member: import("discord.js").GuildMember) {
  return {
    ...serializeMember(member),
    avatar: member.user.displayAvatarURL(),
    premiumSince: member.premiumSince?.toISOString() ?? null,
    communicationDisabledUntil:
      member.communicationDisabledUntil?.toISOString() ?? null,
    pending: member.pending,
    permissions: member.permissions.toArray(),
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_members",
    description: "List guild members with their roles.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        limit: {
          type: "number",
          description: "1–1000, default 50.",
        },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_get_member_info",
    description:
      "Get detailed info about a member: roles, permissions, join date, timeout status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
      },
      required: ["guild_id", "user_id"],
    },
  },
  {
    name: "discord_search_members",
    description: "Search guild members by username or nickname.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        query: {
          type: "string",
          description: "Search query (matches username and nickname).",
        },
        limit: {
          type: "number",
          description: "1–100, default 25.",
        },
      },
      required: ["guild_id", "query"],
    },
  },
  {
    name: "discord_set_nickname",
    description: "Set or clear a member's nickname.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        nickname: {
          type: "string",
          description: "New nickname, or null to clear.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id", "nickname"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_list_members(args) {
    const guild = await getGuild(args.guild_id as string);
    const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 1000);
    const members = await guild.members.fetch({ limit });
    return text(members.map((m) => serializeMember(m)));
  },

  async discord_get_member_info(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    return text(serializeMemberDetailed(member));
  },

  async discord_search_members(args) {
    const guild = await getGuild(args.guild_id as string);
    const query = args.query as string;
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);
    const members = await guild.members.search({ query, limit });
    return text(members.map((m) => serializeMember(m)));
  },

  async discord_set_nickname(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    const nickname = args.nickname === "null" || args.nickname === null
      ? null
      : (args.nickname as string);
    await member.setNickname(nickname, args.reason as string | undefined);
    return text({
      success: true,
      userId: member.id,
      nickname: nickname,
    });
  },
};

export const membersModule: ToolModule = { definitions, handlers };
