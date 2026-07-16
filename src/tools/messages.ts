import {
  EmbedBuilder,
  NewsChannel,
} from "discord.js";
import { discord, ensureConnected, getTextChannel } from "../client.js";
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
    name: "discord_read_messages",
    description:
      "Read messages from a text channel. Returns newest-first by default. Use 'before' to page backward (older) or 'after' to page forward (newer) from a message ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The text channel ID to read from." },
        limit: { type: "number", description: "Number of messages to fetch (1-100, default 20)." },
        before: {
          type: "string",
          description:
            "Message ID cursor: fetch messages BEFORE this message (older messages). Use for backward pagination.",
        },
        after: {
          type: "string",
          description:
            "Message ID cursor: fetch messages AFTER this message (newer messages). Use for forward pagination.",
        },
        around: {
          type: "string",
          description:
            "Message ID cursor: fetch messages around this message ID. Returns messages before and after the given ID.",
        },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_send_message",
    description: "Send a plain text message to a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID to send to." },
        content: { type: "string", description: "The text content of the message." },
      },
      required: ["channel_id", "content"],
    },
  },
  {
    name: "discord_reply_message",
    description: "Reply to a specific message in a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID to reply to." },
        content: { type: "string", description: "The reply text content." },
      },
      required: ["channel_id", "message_id", "content"],
    },
  },
  {
    name: "discord_send_embed",
    description:
      "Send a rich embed message with title, description, color, fields, footer, image, thumbnail, author, URL, and timestamp.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID to send to." },
        title: { type: "string", description: "Embed title." },
        description: { type: "string", description: "Embed description." },
        color: { type: "string", description: "Hex color e.g. #5865F2." },
        fields: {
          type: "array",
          description: "Array of field objects.",
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
        footer: { type: "string", description: "Footer text." },
        image_url: { type: "string", description: "Image URL." },
        thumbnail_url: { type: "string", description: "Small image in top-right corner." },
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
        url: { type: "string", description: "URL that makes the title clickable." },
        timestamp: {
          type: "boolean",
          description: "If true, adds the current timestamp to the embed.",
        },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_send_multiple_embeds",
    description: "Send up to 10 embeds in a single message.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID to send to." },
        content: { type: "string", description: "Optional text content above the embeds." },
        embeds: {
          type: "array",
          description: "Array of embed objects (max 10).",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              color: { type: "string" },
              fields: {
                type: "array",
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
              footer: { type: "string" },
              image_url: { type: "string" },
              thumbnail_url: { type: "string" },
              author: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  url: { type: "string" },
                  icon_url: { type: "string" },
                },
                required: ["name"],
              },
              url: { type: "string" },
              timestamp: { type: "boolean" },
            },
          },
        },
      },
      required: ["channel_id", "embeds"],
    },
  },
  {
    name: "discord_edit_message",
    description: "Edit a message sent by the bot.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: {
          type: "string",
          description: "The message ID to edit (must be a bot message).",
        },
        content: { type: "string", description: "New text content for the message." },
      },
      required: ["channel_id", "message_id", "content"],
    },
  },
  {
    name: "discord_delete_message",
    description: "Delete a specific message from a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID to delete." },
        reason: { type: "string", description: "Reason for deletion." },
      },
      required: ["channel_id", "message_id"],
    },
  },
  {
    name: "discord_bulk_delete_messages",
    description:
      "Delete multiple messages at once (2-100, messages must be less than 14 days old).",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        count: {
          type: "number",
          description: "Number of recent messages to delete (2-100).",
        },
      },
      required: ["channel_id", "count"],
    },
  },
  {
    name: "discord_pin_message",
    description: "Pin or unpin a message in a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID." },
        pin: { type: "boolean", description: "true to pin, false to unpin." },
      },
      required: ["channel_id", "message_id", "pin"],
    },
  },
  {
    name: "discord_fetch_pinned_messages",
    description: "List all pinned messages in a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "discord_add_reaction",
    description: "Add a reaction emoji to a message.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID." },
        emoji: {
          type: "string",
          description: "Unicode emoji (e.g. '👍') or custom emoji in format 'name:id'.",
        },
      },
      required: ["channel_id", "message_id", "emoji"],
    },
  },
  {
    name: "discord_remove_reactions",
    description:
      "Remove reactions from a message. No emoji = remove all. Emoji only = remove that emoji. Emoji + user_id = remove that user's reaction.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID." },
        emoji: {
          type: "string",
          description:
            "Unicode emoji or custom emoji 'name:id'. Omit to remove all reactions.",
        },
        user_id: {
          type: "string",
          description: "Remove only this user's reaction for the given emoji.",
        },
      },
      required: ["channel_id", "message_id"],
    },
  },
  {
    name: "discord_get_reactions",
    description: "List users who reacted with a specific emoji on a message.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: { type: "string", description: "The message ID." },
        emoji: {
          type: "string",
          description: "Unicode emoji or custom emoji 'name:id'.",
        },
        limit: { type: "number", description: "1-100, default 25." },
      },
      required: ["channel_id", "message_id", "emoji"],
    },
  },
  {
    name: "discord_search_messages",
    description:
      "Search messages in a channel by keyword. Scans backward through channel history in batches of 100, up to max_messages total (default 100, max 1000). Use 'before' to start scanning from a specific message ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        keyword: { type: "string", description: "The keyword to search for." },
        limit: {
          type: "number",
          description:
            "Max messages to scan (default 100, max 1000). Kept for backward compatibility; prefer max_messages.",
        },
        max_messages: {
          type: "number",
          description:
            "Max messages to scan (default 100, max 1000). Overrides 'limit' if provided.",
        },
        before: {
          type: "string",
          description:
            "Message ID cursor: start scanning from messages BEFORE this message. If omitted, starts from the most recent message.",
        },
      },
      required: ["channel_id", "keyword"],
    },
  },
  {
    name: "discord_forward_message",
    description: "Forward a message to another channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "Source channel ID." },
        message_id: { type: "string", description: "The message ID to forward." },
        target_channel_id: {
          type: "string",
          description: "Destination channel ID.",
        },
      },
      required: ["channel_id", "message_id", "target_channel_id"],
    },
  },
  {
    name: "discord_crosspost_message",
    description: "Publish a message in an announcement channel to all following channels.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The announcement channel ID." },
        message_id: { type: "string", description: "The message ID to crosspost." },
      },
      required: ["channel_id", "message_id"],
    },
  },
  {
    name: "discord_edit_embed",
    description:
      "Edit an embed message previously sent by the bot. Only provided fields are updated; omitted fields are removed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        message_id: {
          type: "string",
          description: "The message ID to edit (must be a bot message with an embed).",
        },
        title: { type: "string" },
        description: { type: "string" },
        color: { type: "string", description: "Hex color e.g. #5865F2." },
        fields: {
          type: "array",
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
        footer: { type: "string" },
        image_url: { type: "string" },
        thumbnail_url: { type: "string" },
        author: {
          type: "object",
          properties: {
            name: { type: "string" },
            url: { type: "string" },
            icon_url: { type: "string" },
          },
          required: ["name"],
        },
        url: { type: "string" },
        timestamp: { type: "boolean" },
      },
      required: ["channel_id", "message_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_read_messages(args) {
    const channelId = args.channel_id as string;
    const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
    const channel = await getTextChannel(channelId);

    const fetchOptions: { limit: number; before?: string; after?: string; around?: string } = {
      limit,
    };
    if (args.before) fetchOptions.before = args.before as string;
    if (args.after) fetchOptions.after = args.after as string;
    if (args.around) fetchOptions.around = args.around as string;

    const messages = await channel.messages.fetch(fetchOptions);
    const serialized = await Promise.all(messages.map((m) => serializeMessage(m)));
    return text(serialized);
  },

  async discord_send_message(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.send({ content: args.content as string });
    return text({ id: msg.id, channelId: msg.channelId });
  },

  async discord_reply_message(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const target = await channel.messages.fetch(args.message_id as string);
    const msg = await target.reply({ content: args.content as string });
    return text({ id: msg.id, channelId: msg.channelId });
  },

  async discord_send_embed(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const embed = buildEmbed(args);
    const msg = await channel.send({ embeds: [embed] });
    return text({ id: msg.id, channelId: msg.channelId });
  },

  async discord_send_multiple_embeds(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const embedArgs = args.embeds as Record<string, unknown>[];
    if (!embedArgs || embedArgs.length === 0) {
      throw new Error("At least one embed is required");
    }
    if (embedArgs.length > 10) {
      throw new Error("Maximum 10 embeds per message");
    }
    const embeds = embedArgs.map((e) => buildEmbed(e));
    const content = args.content as string | undefined;
    const msg = await channel.send({ content, embeds });
    return text({ id: msg.id, channelId: msg.channelId });
  },

  async discord_edit_message(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    const edited = await msg.edit({ content: args.content as string });
    return text({ id: edited.id, channelId: edited.channelId });
  },

  async discord_delete_message(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    await msg.delete();
    return text({ success: true });
  },

  async discord_bulk_delete_messages(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const count = Math.min(Math.max(Number(args.count) || 2, 2), 100);
    const messages = await channel.messages.fetch({ limit: count });
    const deleted = await channel.bulkDelete(messages, true);
    return text({ deletedCount: deleted.size });
  },

  async discord_pin_message(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    if (args.pin) {
      await msg.pin();
    } else {
      await msg.unpin();
    }
    return text({ success: true, pinned: Boolean(args.pin) });
  },

  async discord_fetch_pinned_messages(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const pinned = await channel.messages.fetchPinned();
    const serialized = await Promise.all(pinned.map((m) => serializeMessage(m)));
    return text(serialized);
  },

  async discord_add_reaction(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    await msg.react(args.emoji as string);
    return text({ success: true });
  },

  async discord_remove_reactions(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    const emoji = args.emoji as string | undefined;
    const userId = args.user_id as string | undefined;

    if (!emoji) {
      await msg.reactions.removeAll();
    } else if (userId) {
      const reaction = msg.reactions.cache.find(
        (r) => r.emoji.name === emoji || r.emoji.identifier === emoji,
      );
      if (reaction) {
        await reaction.users.remove(userId);
      }
    } else {
      const reaction = msg.reactions.cache.find(
        (r) => r.emoji.name === emoji || r.emoji.identifier === emoji,
      );
      if (reaction) {
        await reaction.remove();
      }
    }
    return text({ success: true });
  },

  async discord_get_reactions(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    const emoji = args.emoji as string;
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);

    const reaction = msg.reactions.cache.find(
      (r) => r.emoji.name === emoji || r.emoji.identifier === emoji,
    );
    if (!reaction) {
      return text([]);
    }
    const users = await reaction.users.fetch({ limit });
    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      bot: u.bot,
    }));
    return text(result);
  },

  async discord_search_messages(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const keyword = (args.keyword as string).toLowerCase();

    // max_messages takes priority over limit for the total scan budget
    const maxMessages = Math.min(
      Math.max(Number(args.max_messages ?? args.limit ?? 100), 1),
      1000,
    );
    const batchSize = 100;
    const matches: Awaited<ReturnType<typeof serializeMessage>>[] = [];
    let scanned = 0;
    let cursor: string | undefined = args.before as string | undefined;

    while (scanned < maxMessages) {
      const batch = Math.min(batchSize, maxMessages - scanned);
      const fetchOpts: { limit: number; before?: string } = { limit: batch };
      if (cursor) fetchOpts.before = cursor;

      const messages = await channel.messages.fetch(fetchOpts);
      if (messages.size === 0) break; // no more messages in channel

      for (const m of messages.values()) {
        if (m.content.toLowerCase().includes(keyword)) {
          matches.push(await serializeMessage(m));
        }
      }

      scanned += messages.size;
      // Use the oldest message in this batch as the next cursor
      cursor = messages.last()?.id;
      if (messages.size < batch) break; // reached end of channel
    }

    return text(matches);
  },

  async discord_forward_message(args) {
    const sourceChannel = await getTextChannel(args.channel_id as string);
    const msg = await sourceChannel.messages.fetch(args.message_id as string);
    const targetChannel = await getTextChannel(args.target_channel_id as string);

    const embed = new EmbedBuilder()
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setDescription(msg.content || null)
      .setTimestamp(msg.createdAt)
      .setFooter({ text: `Forwarded from #${sourceChannel.name}` });

    if (msg.attachments.size > 0) {
      const first = msg.attachments.first()!;
      if (first.contentType?.startsWith("image/")) {
        embed.setImage(first.url);
      }
    }

    const forwarded = await targetChannel.send({ embeds: [embed] });
    return text({ id: forwarded.id, channelId: forwarded.channelId });
  },

  async discord_crosspost_message(args) {
    await ensureConnected();
    const channel = await discord.channels.fetch(args.channel_id as string);
    if (!channel || !(channel instanceof NewsChannel)) {
      throw new Error(`Channel ${args.channel_id} is not an announcement channel`);
    }
    const msg = await channel.messages.fetch(args.message_id as string);
    await msg.crosspost();
    return text({ success: true });
  },

  async discord_edit_embed(args) {
    const channel = await getTextChannel(args.channel_id as string);
    const msg = await channel.messages.fetch(args.message_id as string);
    const embed = buildEmbed(args);
    const edited = await msg.edit({ embeds: [embed] });
    return text({ id: edited.id, channelId: edited.channelId });
  },
};

export const messagesModule: ToolModule = { definitions, handlers };
