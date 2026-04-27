import { discord, ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeInvite(invite: import("discord.js").Invite) {
  return {
    code: invite.code,
    url: invite.url,
    channelId: invite.channelId,
    guildId: invite.guild?.id ?? null,
    inviterId: invite.inviterId,
    uses: invite.uses,
    maxUses: invite.maxUses,
    maxAge: invite.maxAge,
    temporary: invite.temporary,
    createdAt: invite.createdAt?.toISOString() ?? null,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_invites",
    description: "List all active invites in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_get_invite",
    description: "Get details about a specific invite by its code.",
    inputSchema: {
      type: "object" as const,
      properties: {
        invite_code: {
          type: "string",
          description:
            "The invite code (e.g. 'abc123' from discord.gg/abc123).",
        },
      },
      required: ["invite_code"],
    },
  },
  {
    name: "discord_create_invite",
    description: "Create an invite link for a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        max_age: {
          type: "number",
          description:
            "Invite duration in seconds (0 = never expires). Default 86400 (24h).",
        },
        max_uses: {
          type: "number",
          description:
            "Max number of uses (0 = unlimited). Default 0.",
        },
        temporary: {
          type: "boolean",
          description:
            "If true, members joined via this invite are kicked when they disconnect. Default false.",
        },
        unique: {
          type: "boolean",
          description:
            "If true, create a new unique invite even if one exists. Default false.",
        },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_delete_invite",
    description: "Delete (revoke) an invite by its code.",
    inputSchema: {
      type: "object" as const,
      properties: {
        invite_code: {
          type: "string",
          description: "The invite code to revoke.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["invite_code"],
    },
  },
  {
    name: "discord_list_channel_invites",
    description: "List all active invites for a specific channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
      },
      required: ["channel_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_list_invites(args) {
    const guild = await getGuild(args.guild_id as string);
    const invites = await guild.invites.fetch();
    return text(invites.map((inv) => serializeInvite(inv)));
  },

  async discord_get_invite(args) {
    await ensureConnected();
    const invite = await discord.fetchInvite(args.invite_code as string);
    return text(serializeInvite(invite));
  },

  async discord_create_invite(args) {
    await ensureConnected();
    const channel = await discord.channels.fetch(args.channel_id as string);
    if (!channel || !("createInvite" in channel)) {
      throw new Error(
        `Channel ${args.channel_id} does not support invites.`,
      );
    }
    const invite = await (
      channel as import("discord.js").TextChannel
    ).createInvite({
      maxAge: args.max_age !== undefined ? Number(args.max_age) : 86400,
      maxUses: args.max_uses !== undefined ? Number(args.max_uses) : 0,
      temporary: Boolean(args.temporary ?? false),
      unique: Boolean(args.unique ?? false),
    });
    return text(serializeInvite(invite));
  },

  async discord_delete_invite(args) {
    await ensureConnected();
    const invite = await discord.fetchInvite(args.invite_code as string);
    await invite.delete(args.reason as string | undefined);
    return text({ success: true, deletedInviteCode: args.invite_code });
  },

  async discord_list_channel_invites(args) {
    await ensureConnected();
    const channel = await discord.channels.fetch(args.channel_id as string);
    if (!channel || !("fetchInvites" in channel)) {
      throw new Error(
        `Channel ${args.channel_id} does not support invites.`,
      );
    }
    const invites = await (
      channel as import("discord.js").TextChannel
    ).fetchInvites();
    return text(invites.map((inv) => serializeInvite(inv)));
  },
};

export const invitesModule: ToolModule = { definitions, handlers };
