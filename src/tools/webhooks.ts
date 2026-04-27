import { EmbedBuilder } from "discord.js";
import { discord, ensureConnected } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeWebhook(wh: import("discord.js").Webhook) {
  return {
    id: wh.id,
    name: wh.name,
    channelId: wh.channelId,
    guildId: wh.guildId,
    token: wh.token,
    url: wh.url,
    avatar: wh.avatarURL(),
    createdAt: wh.createdAt.toISOString(),
  };
}

function buildEmbed(data: Record<string, unknown>): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (data.title) embed.setTitle(data.title as string);
  if (data.description) embed.setDescription(data.description as string);
  if (data.url) embed.setURL(data.url as string);
  if (data.color)
    embed.setColor(parseInt(String(data.color).replace("#", ""), 16));
  if (data.footer) embed.setFooter({ text: data.footer as string });
  if (data.image_url) embed.setImage(data.image_url as string);
  if (data.thumbnail_url) embed.setThumbnail(data.thumbnail_url as string);
  if (data.timestamp) embed.setTimestamp();
  if (data.fields && Array.isArray(data.fields)) {
    for (const f of data.fields as {
      name: string;
      value: string;
      inline?: boolean;
    }[]) {
      embed.addFields({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      });
    }
  }
  return embed;
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_create_webhook",
    description: "Create a webhook on a channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: { type: "string", description: "The channel ID." },
        name: { type: "string", description: "Name for the webhook." },
        avatar: {
          type: "string",
          description: "Optional avatar URL for the webhook.",
        },
      },
      required: ["channel_id", "name"],
    },
  },
  {
    name: "discord_send_webhook_message",
    description: "Send a message via a webhook using its ID and token.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
        webhook_token: { type: "string", description: "The webhook token." },
        content: {
          type: "string",
          description: "Text content of the message.",
        },
        username: {
          type: "string",
          description: "Override the webhook's default username.",
        },
        avatar_url: {
          type: "string",
          description: "Override the webhook's default avatar.",
        },
        embeds: {
          type: "array",
          items: { type: "object" },
          description: "Optional array of embed objects.",
        },
      },
      required: ["webhook_id", "webhook_token"],
    },
  },
  {
    name: "discord_edit_webhook",
    description: "Edit a webhook's name, avatar, or channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
        name: { type: "string", description: "New name for the webhook." },
        avatar: {
          type: "string",
          description: "New avatar URL for the webhook.",
        },
        channel_id: {
          type: "string",
          description: "Move the webhook to a different channel.",
        },
      },
      required: ["webhook_id"],
    },
  },
  {
    name: "discord_delete_webhook",
    description: "Delete a webhook.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
      },
      required: ["webhook_id"],
    },
  },
  {
    name: "discord_list_webhooks",
    description:
      "List all webhooks for a channel or guild. Provide either channel_id or guild_id.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channel_id: {
          type: "string",
          description: "List webhooks for a specific channel.",
        },
        guild_id: {
          type: "string",
          description: "List all webhooks in a guild.",
        },
      },
      required: [],
    },
  },
  {
    name: "discord_edit_webhook_message",
    description: "Edit a message previously sent by a webhook.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
        webhook_token: { type: "string", description: "The webhook token." },
        message_id: { type: "string", description: "The message ID to edit." },
        content: { type: "string", description: "New text content." },
        embeds: {
          type: "array",
          items: { type: "object" },
          description: "Optional array of embed objects.",
        },
      },
      required: ["webhook_id", "webhook_token", "message_id"],
    },
  },
  {
    name: "discord_delete_webhook_message",
    description: "Delete a message sent by a webhook.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
        webhook_token: { type: "string", description: "The webhook token." },
        message_id: { type: "string", description: "The message ID to delete." },
      },
      required: ["webhook_id", "webhook_token", "message_id"],
    },
  },
  {
    name: "discord_fetch_webhook_message",
    description: "Fetch a specific message sent by a webhook.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "string", description: "The webhook ID." },
        webhook_token: { type: "string", description: "The webhook token." },
        message_id: { type: "string", description: "The message ID to fetch." },
      },
      required: ["webhook_id", "webhook_token", "message_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_create_webhook(args) {
    await ensureConnected();
    const channel = await discord.channels.fetch(args.channel_id as string);
    if (!channel || !("createWebhook" in channel)) {
      throw new Error(
        `Channel ${args.channel_id} does not support webhooks`,
      );
    }
    const options: { name: string; avatar?: string } = {
      name: args.name as string,
    };
    if (args.avatar) options.avatar = args.avatar as string;
    const webhook = await (
      channel as import("discord.js").TextChannel
    ).createWebhook(options);
    return text(serializeWebhook(webhook));
  },

  async discord_send_webhook_message(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(
      args.webhook_id as string,
      args.webhook_token as string,
    );
    const options: import("discord.js").WebhookMessageCreateOptions = {};
    if (args.content) options.content = args.content as string;
    if (args.username) options.username = args.username as string;
    if (args.avatar_url) options.avatarURL = args.avatar_url as string;
    if (args.embeds && Array.isArray(args.embeds)) {
      options.embeds = (args.embeds as Record<string, unknown>[]).map((e) =>
        buildEmbed(e),
      );
    }
    const msg = await webhook.send(options);
    return text({
      id: msg.id,
      channelId: msg.channelId,
      content: msg.content,
      webhookId: webhook.id,
    });
  },

  async discord_edit_webhook(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(args.webhook_id as string);
    const options: import("discord.js").WebhookEditOptions = {};
    if (args.name !== undefined) options.name = args.name as string;
    if (args.avatar !== undefined) options.avatar = args.avatar as string;
    if (args.channel_id !== undefined)
      options.channel = args.channel_id as string;
    const updated = await webhook.edit(options);
    return text(serializeWebhook(updated));
  },

  async discord_delete_webhook(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(args.webhook_id as string);
    await webhook.delete();
    return text({ success: true, deletedWebhookId: args.webhook_id });
  },

  async discord_list_webhooks(args) {
    await ensureConnected();
    if (args.channel_id) {
      const channel = await discord.channels.fetch(args.channel_id as string);
      if (!channel || !("fetchWebhooks" in channel)) {
        throw new Error(
          `Channel ${args.channel_id} does not support webhooks`,
        );
      }
      const webhooks = await (
        channel as import("discord.js").TextChannel
      ).fetchWebhooks();
      return text(webhooks.map((wh) => serializeWebhook(wh)));
    }
    if (args.guild_id) {
      const guild = await discord.guilds.fetch(args.guild_id as string);
      const webhooks = await guild.fetchWebhooks();
      return text(webhooks.map((wh) => serializeWebhook(wh)));
    }
    throw new Error("Provide either channel_id or guild_id");
  },

  async discord_edit_webhook_message(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(
      args.webhook_id as string,
      args.webhook_token as string,
    );
    const options: import("discord.js").WebhookMessageEditOptions = {};
    if (args.content !== undefined) options.content = args.content as string;
    if (args.embeds && Array.isArray(args.embeds)) {
      options.embeds = (args.embeds as Record<string, unknown>[]).map((e) =>
        buildEmbed(e),
      );
    }
    const msg = await webhook.editMessage(
      args.message_id as string,
      options,
    );
    return text({
      id: msg.id,
      channelId: msg.channelId,
      content: msg.content,
    });
  },

  async discord_delete_webhook_message(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(
      args.webhook_id as string,
      args.webhook_token as string,
    );
    await webhook.deleteMessage(args.message_id as string);
    return text({
      success: true,
      deletedMessageId: args.message_id,
    });
  },

  async discord_fetch_webhook_message(args) {
    await ensureConnected();
    const webhook = await discord.fetchWebhook(
      args.webhook_id as string,
      args.webhook_token as string,
    );
    const msg = await webhook.fetchMessage(args.message_id as string);
    return text({
      id: msg.id,
      channelId: msg.channelId,
      content: msg.content,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        bot: msg.author.bot,
      },
      embeds: msg.embeds.map((e) => ({
        title: e.title,
        description: e.description,
        url: e.url,
        color: e.hexColor,
        fields: e.fields,
      })),
      attachments: msg.attachments.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
      })),
      timestamp: msg.createdAt.toISOString(),
    });
  },
};

export const webhooksModule: ToolModule = { definitions, handlers };
