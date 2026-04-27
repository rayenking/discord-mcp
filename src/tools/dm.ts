import { ChannelType, DMChannel, EmbedBuilder } from "discord.js";
import { discord, ensureConnected } from "../client.js";
import { serializeMessage } from "../serializer.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function buildEmbed(args: Record<string, unknown>): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (args.title) embed.setTitle(args.title as string);
  if (args.description) embed.setDescription(args.description as string);
  if (args.url) embed.setURL(args.url as string);
  if (args.color) embed.setColor(parseInt(String(args.color).replace("#", ""), 16));
  if (args.footer) embed.setFooter({ text: args.footer as string });
  if (args.image_url) embed.setImage(args.image_url as string);
  if (args.thumbnail_url) embed.setThumbnail(args.thumbnail_url as string);
  if (args.timestamp) embed.setTimestamp();

  if (args.author) {
    const author = args.author as Record<string, unknown>;
    embed.setAuthor({
      name: author.name as string,
      url: author.url as string | undefined,
      iconURL: author.icon_url as string | undefined,
    });
  }

  if (args.fields && Array.isArray(args.fields)) {
    for (const f of args.fields as { name: string; value: string; inline?: boolean }[]) {
      embed.addFields({ name: f.name, value: f.value, inline: f.inline ?? false });
    }
  }

  return embed;
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_send_dm",
    description: "Send a direct message to a user by their user ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string", description: "The user ID to send a DM to." },
        content: { type: "string", description: "The text content of the message." },
      },
      required: ["user_id", "content"],
    },
  },
  {
    name: "discord_read_dms",
    description: "Read the last N messages from a DM channel with a user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string", description: "The user ID whose DM channel to read." },
        limit: { type: "number", description: "Number of messages to fetch (1-100, default 20)." },
      },
      required: ["user_id"],
    },
  },
  {
    name: "discord_list_dm_channels",
    description: "List all currently open/cached DM channels the bot has.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "discord_send_dm_embed",
    description: "Send a rich embed as a direct message to a user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string", description: "The user ID to send the embed DM to." },
        title: { type: "string", description: "Embed title." },
        description: { type: "string", description: "Embed description." },
        url: { type: "string", description: "URL that makes the title clickable." },
        color: { type: "string", description: "Hex color e.g. #5865F2." },
        footer: { type: "string", description: "Footer text." },
        image_url: { type: "string", description: "Image URL." },
        thumbnail_url: { type: "string", description: "Thumbnail URL." },
        timestamp: { type: "boolean", description: "If true, adds the current timestamp." },
        author: {
          type: "object",
          description: "Author block.",
          properties: {
            name: { type: "string" },
            url: { type: "string" },
            icon_url: { type: "string" },
          },
          required: ["name"],
        },
        fields: {
          type: "array",
          description: "Embed fields.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              value: { type: "string" },
              inline: { type: "boolean" },
            },
            required: ["name", "value"],
          },
        },
      },
      required: ["user_id"],
    },
  },
];

async function getDMChannel(userId: string): Promise<DMChannel> {
  await ensureConnected();
  const user = await discord.users.fetch(userId);
  return user.createDM();
}

const handlers: ToolModule["handlers"] = {
  async discord_send_dm(args) {
    const dm = await getDMChannel(args.user_id as string);
    const msg = await dm.send({ content: args.content as string });
    return text({ id: msg.id, channelId: msg.channelId });
  },

  async discord_read_dms(args) {
    const dm = await getDMChannel(args.user_id as string);
    const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
    const messages = await dm.messages.fetch({ limit });
    const serialized = await Promise.all(messages.map((m) => serializeMessage(m)));
    return text(serialized);
  },

  async discord_list_dm_channels(args) {
    await ensureConnected();
    const dmChannels = discord.channels.cache.filter(
      (ch): ch is DMChannel => ch.type === ChannelType.DM,
    );
    const result = dmChannels.map((ch) => ({
      id: ch.id,
      recipientId: ch.recipient?.id ?? null,
      recipientUsername: ch.recipient?.username ?? null,
      recipientDisplayName: ch.recipient?.displayName ?? null,
      lastMessageId: ch.lastMessageId,
    }));
    return text(result);
  },

  async discord_send_dm_embed(args) {
    const dm = await getDMChannel(args.user_id as string);
    const embed = buildEmbed(args);
    const msg = await dm.send({ embeds: [embed] });
    return text({ id: msg.id, channelId: msg.channelId });
  },
};

export const dmModule: ToolModule = { definitions, handlers };
