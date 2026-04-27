import {
  ChannelType,
  OverwriteType,
  PermissionsBitField,
  type GuildChannel,
} from "discord.js";
import { discord, ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

async function fetchGuildChannel(channelId: string): Promise<GuildChannel> {
  await ensureConnected();
  const channel = await discord.channels.fetch(channelId);
  if (!channel || !("guild" in channel) || !channel.guild) {
    throw new Error(`Channel ${channelId} is not a guild channel or does not exist`);
  }
  return channel as GuildChannel;
}

function serializeOverwrites(channel: GuildChannel) {
  return channel.permissionOverwrites.cache.map((ow) => ({
    id: ow.id,
    type: ow.type === OverwriteType.Role ? "role" : "member",
    allow: new PermissionsBitField(ow.allow).toArray(),
    deny: new PermissionsBitField(ow.deny).toArray(),
  }));
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_get_channel_permissions",
    description:
      "List all permission overwrites on a channel (per role and per member).",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_set_role_permission",
    description:
      "Allow or deny specific permissions for a role on a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        role_id: { type: "string", description: "The role ID." },
        allow: {
          type: "array",
          items: { type: "string" },
          description: "Permission names to allow, e.g. ['SendMessages','ViewChannel'].",
        },
        deny: {
          type: "array",
          items: { type: "string" },
          description: "Permission names to deny.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["channel_id", "role_id"],
    },
  },
  {
    name: "discord_set_member_permission",
    description:
      "Allow or deny specific permissions for a single member on a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        user_id: { type: "string", description: "The user ID." },
        allow: {
          type: "array",
          items: { type: "string" },
          description: "Permission names to allow.",
        },
        deny: {
          type: "array",
          items: { type: "string" },
          description: "Permission names to deny.",
        },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["channel_id", "user_id"],
    },
  },
  {
    name: "discord_lock_channel_permissions",
    description:
      "Sync a channel's permissions with its parent category.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_reset_channel_permissions",
    description:
      "Remove ALL permission overwrites on a channel (reset to inherited).",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_copy_permissions",
    description:
      "Copy all permission overwrites from one channel to another.",
    inputSchema: {
      type: "object" as const,
      properties: {
        source_channel_id: { type: "string", description: "Source channel ID." },
        target_channel_id: { type: "string", description: "Target channel ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["source_channel_id", "target_channel_id"],
    },
  },
  {
    name: "discord_audit_permissions",
    description:
      "Generate a full permission audit report for a guild: who can access what on every channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
];

function resolvePermissions(perms: unknown): bigint {
  if (!Array.isArray(perms) || perms.length === 0) return 0n;
  return perms.reduce((bits: bigint, name: string) => {
    const flag = PermissionsBitField.Flags[name as keyof typeof PermissionsBitField.Flags];
    if (flag === undefined) {
      throw new Error(`Unknown permission: ${name}`);
    }
    return bits | flag;
  }, 0n);
}

const handlers: ToolModule["handlers"] = {
  async discord_get_channel_permissions(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    return text(serializeOverwrites(channel));
  },

  async discord_set_role_permission(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const roleId = args.role_id as string;
    const allowPerms = (args.allow as string[] | undefined) ?? [];
    const denyPerms = (args.deny as string[] | undefined) ?? [];
    const reason = args.reason as string | undefined;

    resolvePermissions(allowPerms);
    resolvePermissions(denyPerms);

    await channel.permissionOverwrites.edit(
      roleId,
      Object.fromEntries([
        ...allowPerms.map((p) => [p, true]),
        ...denyPerms.map((p) => [p, false]),
      ]),
      { type: OverwriteType.Role, reason },
    );

    return text({ success: true, channelId: channel.id, roleId, allow: allowPerms, deny: denyPerms });
  },

  async discord_set_member_permission(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const userId = args.user_id as string;
    const allowPerms = (args.allow as string[] | undefined) ?? [];
    const denyPerms = (args.deny as string[] | undefined) ?? [];
    const reason = args.reason as string | undefined;

    resolvePermissions(allowPerms);
    resolvePermissions(denyPerms);

    await channel.permissionOverwrites.edit(
      userId,
      Object.fromEntries([
        ...allowPerms.map((p) => [p, true]),
        ...denyPerms.map((p) => [p, false]),
      ]),
      { type: OverwriteType.Member, reason },
    );

    return text({ success: true, channelId: channel.id, userId, allow: allowPerms, deny: denyPerms });
  },

  async discord_lock_channel_permissions(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    if (!channel.parent) {
      throw new Error(`Channel ${args.channel_id} has no parent category to sync with`);
    }
    await channel.lockPermissions();
    return text({ success: true, channelId: channel.id, syncedWith: channel.parent.id });
  },

  async discord_reset_channel_permissions(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const reason = args.reason as string | undefined;
    const overwrites = channel.permissionOverwrites.cache;

    await Promise.all(
      overwrites.map((ow) => ow.delete(reason)),
    );

    return text({ success: true, channelId: channel.id, removedCount: overwrites.size });
  },

  async discord_copy_permissions(args) {
    const source = await fetchGuildChannel(args.source_channel_id as string);
    const target = await fetchGuildChannel(args.target_channel_id as string);
    const reason = args.reason as string | undefined;

    const sourceOverwrites = source.permissionOverwrites.cache;

    for (const [, ow] of sourceOverwrites) {
      const permObj: Record<string, boolean | null> = {};
      for (const perm of new PermissionsBitField(ow.allow).toArray()) {
        permObj[perm] = true;
      }
      for (const perm of new PermissionsBitField(ow.deny).toArray()) {
        permObj[perm] = false;
      }
      await target.permissionOverwrites.edit(ow.id, permObj, {
        type: ow.type,
        reason,
      });
    }

    return text({
      success: true,
      sourceChannelId: source.id,
      targetChannelId: target.id,
      copiedOverwrites: sourceOverwrites.size,
    });
  },

  async discord_audit_permissions(args) {
    const guild = await getGuild(args.guild_id as string);
    const channels = await guild.channels.fetch();

    const allChannels = [...channels.values()].filter(
      (ch) => ch !== null && ch.type !== ChannelType.GuildCategory,
    );

    const report = allChannels.map((ch) => ({
      channelId: ch!.id,
      channelName: ch!.name,
      type: ChannelType[ch!.type],
      parentName: ch!.parent?.name ?? null,
      overwrites: serializeOverwrites(ch as GuildChannel),
    }));

    return text(report);
  },
};

export const permissionsModule: ToolModule = { definitions, handlers };
