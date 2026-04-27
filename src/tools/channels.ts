import {
  ChannelType,
  NewsChannel,
  type GuildChannel,
  type CategoryChannel,
} from "discord.js";
import { discord, ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeChannel(ch: GuildChannel) {
  return {
    id: ch.id,
    name: ch.name,
    type: ChannelType[ch.type],
    position: ch.position,
    parentId: ch.parentId,
    parentName: ch.parent?.name ?? null,
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_channels",
    description:
      "List all channels in a guild grouped by category.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_find_channel_by_name",
    description:
      "Find a channel by name in a guild (partial match supported).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        name: { type: "string", description: "Channel name to search for (partial match)." },
      },
      required: ["guild_id", "name"],
    },
  },
  {
    name: "discord_create_channel",
    description:
      "Create a text, voice channel or category in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        name: { type: "string", description: "Channel name." },
        type: {
          type: "string",
          description: "Channel type: 'text', 'voice', or 'category'. Defaults to 'text'.",
          enum: ["text", "voice", "category"],
        },
        topic: { type: "string", description: "Channel topic (text channels only)." },
        category_id: { type: "string", description: "Parent category ID." },
      },
      required: ["guild_id", "name"],
    },
  },
  {
    name: "discord_edit_channel",
    description:
      "Edit a channel's name, topic, slowmode, or NSFW flag.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        name: { type: "string", description: "New channel name." },
        topic: { type: "string", description: "New channel topic." },
        slowmode: { type: "number", description: "Slowmode in seconds (0 to disable)." },
        nsfw: { type: "boolean", description: "Mark channel as NSFW." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_delete_channel",
    description: "Delete a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        reason: { type: "string", description: "Reason for deletion." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_move_channel",
    description:
      "Move a channel into a category (or remove from category if category_id is omitted).",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        category_id: {
          type: "string",
          description: "Target category ID. Omit to remove from category.",
        },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_clone_channel",
    description:
      "Clone a channel with its name, topic and permission overwrites.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID to clone." },
        new_name: { type: "string", description: "Name for the cloned channel." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_set_channel_position",
    description:
      "Set the display position of a channel within its category.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        position: { type: "number", description: "New position number." },
      },
      required: ["channel_id", "position"],
    },
  },
  {
    name: "discord_follow_announcement_channel",
    description:
      "Follow an announcement channel so its messages are published to a target channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        source_channel_id: {
          type: "string",
          description: "The announcement channel to follow.",
        },
        target_channel_id: {
          type: "string",
          description: "The channel that will receive published messages.",
        },
      },
      required: ["source_channel_id", "target_channel_id"],
    },
  },
];

async function fetchGuildChannel(channelId: string): Promise<GuildChannel> {
  await ensureConnected();
  const channel = await discord.channels.fetch(channelId);
  if (!channel || !("guild" in channel) || !channel.guild) {
    throw new Error(`Channel ${channelId} is not a guild channel or does not exist`);
  }
  return channel as GuildChannel;
}

const handlers: ToolModule["handlers"] = {
  async discord_list_channels(args) {
    const guild = await getGuild(args.guild_id as string);
    const channels = await guild.channels.fetch();

    const categories = new Map<string | null, { name: string | null; channels: ReturnType<typeof serializeChannel>[] }>();

    categories.set(null, { name: null, channels: [] });

    for (const [, ch] of channels) {
      if (!ch) continue;
      if (ch.type === ChannelType.GuildCategory) {
        if (!categories.has(ch.id)) {
          categories.set(ch.id, { name: ch.name, channels: [] });
        }
      }
    }

    for (const [, ch] of channels) {
      if (!ch || ch.type === ChannelType.GuildCategory) continue;
      const parentId = ch.parentId;
      if (!categories.has(parentId)) {
        categories.set(parentId, { name: ch.parent?.name ?? "Unknown", channels: [] });
      }
      categories.get(parentId)!.channels.push(serializeChannel(ch));
    }

    for (const group of categories.values()) {
      group.channels.sort((a, b) => a.position - b.position);
    }

    const result = Array.from(categories.entries()).map(([catId, group]) => ({
      categoryId: catId,
      categoryName: group.name,
      channels: group.channels,
    }));

    return text(result);
  },

  async discord_find_channel_by_name(args) {
    const guild = await getGuild(args.guild_id as string);
    const name = (args.name as string).toLowerCase();
    const channels = await guild.channels.fetch();

    const matches = channels
      .filter((ch) => ch !== null && ch.name.toLowerCase().includes(name))
      .map((ch) => serializeChannel(ch!));

    return text(matches);
  },

  async discord_create_channel(args) {
    const guild = await getGuild(args.guild_id as string);
    const name = args.name as string;
    const typeStr = (args.type as string | undefined) ?? "text";

    const typeMap = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      category: ChannelType.GuildCategory,
    } as const;

    const channelType = typeMap[typeStr as keyof typeof typeMap];
    if (channelType === undefined) {
      throw new Error(`Invalid channel type: ${typeStr}. Must be 'text', 'voice', or 'category'.`);
    }

    const channel = await guild.channels.create({
      name,
      type: channelType,
      topic: args.topic as string | undefined,
      parent: args.category_id as string | undefined,
    });
    return text(serializeChannel(channel));
  },

  async discord_edit_channel(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name as string;
    if (args.topic !== undefined) updates.topic = args.topic as string;
    if (args.slowmode !== undefined) updates.rateLimitPerUser = Number(args.slowmode);
    if (args.nsfw !== undefined) updates.nsfw = Boolean(args.nsfw);

    const edited = await channel.edit(updates);
    return text(serializeChannel(edited as GuildChannel));
  },

  async discord_delete_channel(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    await channel.delete(args.reason as string | undefined);
    return text({ success: true, deletedChannelId: args.channel_id });
  },

  async discord_move_channel(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const categoryId = args.category_id as string | undefined;
    await channel.setParent(categoryId ?? null);
    return text({
      id: channel.id,
      name: channel.name,
      parentId: categoryId ?? null,
    });
  },

  async discord_clone_channel(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const newName = args.new_name as string | undefined;
    const cloned = await channel.clone({ name: newName ?? undefined });
    return text(serializeChannel(cloned));
  },

  async discord_set_channel_position(args) {
    const channel = await fetchGuildChannel(args.channel_id as string);
    const position = Number(args.position);
    await channel.setPosition(position);
    return text({ id: channel.id, name: channel.name, position });
  },

  async discord_follow_announcement_channel(args) {
    await ensureConnected();
    const source = await discord.channels.fetch(args.source_channel_id as string);
    if (!source || !(source instanceof NewsChannel)) {
      throw new Error(
        `Channel ${args.source_channel_id} is not an announcement channel`,
      );
    }
    await source.addFollower(args.target_channel_id as string);
    return text({
      success: true,
      sourceChannelId: args.source_channel_id,
      targetChannelId: args.target_channel_id,
    });
  },
};

export const channelsModule: ToolModule = { definitions, handlers };
