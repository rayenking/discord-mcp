import {
  ChannelType,
  ForumChannel,
  type AnyThreadChannel,
  type ForumThreadChannel,
  type GuildForumTagData,
} from "discord.js";
import { discord, ensureConnected, getGuild } from "../client.js";
import { serializeMessage } from "../serializer.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeForumChannel(channel: ForumChannel) {
  return {
    id: channel.id,
    name: channel.name,
    type: ChannelType[channel.type],
    topic: channel.topic,
    parentId: channel.parentId,
    parentName: channel.parent?.name ?? null,
    position: channel.position,
    nsfw: channel.nsfw,
    availableTags: channel.availableTags,
  };
}

function serializeForumThread(thread: ForumThreadChannel) {
  return {
    id: thread.id,
    name: thread.name,
    parentId: thread.parentId,
    parentName: thread.parent?.name ?? null,
    ownerId: thread.ownerId,
    archived: thread.archived,
    locked: thread.locked,
    pinned: thread.flags?.has("Pinned") ?? false,
    appliedTags: thread.appliedTags,
    messageCount: thread.messageCount,
    memberCount: thread.memberCount,
    totalMessageSent: thread.totalMessageSent,
    rateLimitPerUser: thread.rateLimitPerUser,
    createdTimestamp: thread.createdTimestamp,
    lastMessageId: thread.lastMessageId,
    url: thread.url,
  };
}

async function getForumChannel(channelId: string): Promise<ForumChannel> {
  await ensureConnected();
  const channel = await discord.channels.fetch(channelId);

  if (!channel || !(channel instanceof ForumChannel)) {
    throw new Error(`Channel ${channelId} is not a forum channel or does not exist`);
  }

  return channel;
}

async function getForumThread(threadId: string): Promise<ForumThreadChannel> {
  await ensureConnected();
  const channel = await discord.channels.fetch(threadId);

  if (!channel || !channel.isThread()) {
    throw new Error(`Channel ${threadId} is not a thread or does not exist`);
  }

  const thread = channel as AnyThreadChannel;
  if (!(thread.parent instanceof ForumChannel)) {
    throw new Error(`Thread ${threadId} is not a forum post thread`);
  }

  return thread as ForumThreadChannel;
}

function buildForumTags(tags: unknown): GuildForumTagData[] {
  if (!Array.isArray(tags)) {
    throw new Error("tags must be an array");
  }

  return tags.map((tag, index) => {
    if (!tag || typeof tag !== "object") {
      throw new Error(`Tag at index ${index} must be an object`);
    }

    const value = tag as Record<string, unknown>;
    const name = value.name;
    if (typeof name !== "string" || !name.trim()) {
      throw new Error(`Tag at index ${index} must include a non-empty name`);
    }

    const emojiName = value.emoji_name;

    return {
      name,
      moderated: Boolean(value.moderated),
      emoji: emojiName === undefined ? undefined : { id: null, name: String(emojiName) },
    };
  });
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_get_forum_channels",
    description: "List all forum channels in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_create_forum_channel",
    description: "Create a new forum channel in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        name: { type: "string", description: "Forum channel name." },
        topic: { type: "string", description: "The forum channel guidelines/topic." },
        category_id: { type: "string", description: "Parent category ID (optional)." },
      },
      required: ["guild_id", "name"],
    },
  },
  {
    name: "discord_list_forum_threads",
    description: "List all threads (active and archived) in a forum channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forum_channel_id: { type: "string", description: "The forum channel ID." },
      },
      required: ["forum_channel_id"],
    },
  },
  {
    name: "discord_create_forum_post",
    description: "Create a new post (thread) in a forum channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forum_channel_id: { type: "string", description: "The forum channel ID." },
        title: { type: "string", description: "The post title (thread name)." },
        content: { type: "string", description: "The initial message content of the post." },
        applied_tags: {
          type: "array",
          description: "Array of tag IDs to apply to the post.",
          items: { type: "string" },
        },
      },
      required: ["forum_channel_id", "title", "content"],
    },
  },
  {
    name: "discord_get_forum_post",
    description: "Get a forum post's details and its messages.",
    inputSchema: {
      type: "object" as const,
      properties: {
        thread_id: { type: "string", description: "The forum post thread ID." },
        limit: { type: "number", description: "Number of messages to fetch (1-100, default 20)." },
      },
      required: ["thread_id"],
    },
  },
  {
    name: "discord_reply_to_forum",
    description: "Reply to a forum post (send a message in a forum thread).",
    inputSchema: {
      type: "object" as const,
      properties: {
        thread_id: { type: "string", description: "The forum post thread ID." },
        content: { type: "string", description: "The reply text content." },
      },
      required: ["thread_id", "content"],
    },
  },
  {
    name: "discord_delete_forum_post",
    description: "Delete (close) a forum post/thread.",
    inputSchema: {
      type: "object" as const,
      properties: {
        thread_id: { type: "string", description: "The forum post thread ID." },
      },
      required: ["thread_id"],
    },
  },
  {
    name: "discord_get_forum_tags",
    description: "Get the available tags for a forum channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forum_channel_id: { type: "string", description: "The forum channel ID." },
      },
      required: ["forum_channel_id"],
    },
  },
  {
    name: "discord_set_forum_tags",
    description: "Set or update the available tags on a forum channel.",
    inputSchema: {
      type: "object" as const,
      properties: {
        forum_channel_id: { type: "string", description: "The forum channel ID." },
        tags: {
          type: "array",
          description: "Array of tag objects to set on the forum channel.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              emoji_name: { type: "string" },
              moderated: { type: "boolean" },
            },
            required: ["name"],
          },
        },
      },
      required: ["forum_channel_id", "tags"],
    },
  },
  {
    name: "discord_update_forum_post",
    description: "Update a forum post's title, archived/locked status, or applied tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        thread_id: { type: "string", description: "The forum post thread ID." },
        title: { type: "string", description: "New title for the forum post." },
        archived: { type: "boolean", description: "Whether to archive the thread." },
        locked: { type: "boolean", description: "Whether to lock the thread." },
        applied_tags: {
          type: "array",
          description: "Array of tag IDs to apply to the post.",
          items: { type: "string" },
        },
      },
      required: ["thread_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_get_forum_channels(args) {
    const guild = await getGuild(args.guild_id as string);
    const channels = await guild.channels.fetch();

    const forumChannels = channels
      .filter((channel): channel is ForumChannel => channel instanceof ForumChannel)
      .map((channel) => serializeForumChannel(channel));

    return text(forumChannels);
  },

  async discord_create_forum_channel(args) {
    const guild = await getGuild(args.guild_id as string);
    const channel = await guild.channels.create({
      name: args.name as string,
      type: ChannelType.GuildForum,
      topic: args.topic as string | undefined,
      parent: args.category_id as string | undefined,
    });

    return text(serializeForumChannel(channel));
  },

  async discord_list_forum_threads(args) {
    const forum = await getForumChannel(args.forum_channel_id as string);
    const active = await forum.guild.channels.fetchActiveThreads();
    const archived = await forum.threads.fetchArchived();

    const threads = [...active.threads.values(), ...archived.threads.values()]
      .filter(
        (thread): thread is ForumThreadChannel =>
          thread.parent instanceof ForumChannel && thread.parentId === forum.id,
      )
      .map((thread) => serializeForumThread(thread));

    return text(threads);
  },

  async discord_create_forum_post(args) {
    const forum = await getForumChannel(args.forum_channel_id as string);
    const thread = await forum.threads.create({
      name: args.title as string,
      message: { content: args.content as string },
      appliedTags: (args.applied_tags as string[] | undefined) ?? [],
    });

    return text(serializeForumThread(thread));
  },

  async discord_get_forum_post(args) {
    const thread = await getForumThread(args.thread_id as string);
    const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
    const messages = await thread.messages.fetch({ limit });
    const serializedMessages = await Promise.all(messages.map((message) => serializeMessage(message)));

    return text({
      thread: serializeForumThread(thread),
      messages: serializedMessages,
    });
  },

  async discord_reply_to_forum(args) {
    const thread = await getForumThread(args.thread_id as string);
    const message = await thread.send({ content: args.content as string });

    return text(await serializeMessage(message));
  },

  async discord_delete_forum_post(args) {
    const thread = await getForumThread(args.thread_id as string);
    await thread.delete();
    return text({ deleted: true, threadId: args.thread_id as string });
  },

  async discord_get_forum_tags(args) {
    const forum = await getForumChannel(args.forum_channel_id as string);
    return text(forum.availableTags);
  },

  async discord_set_forum_tags(args) {
    const forum = await getForumChannel(args.forum_channel_id as string);
    const tags = buildForumTags(args.tags);
    const updated = await forum.setAvailableTags(tags);
    return text(updated.availableTags);
  },

  async discord_update_forum_post(args) {
    const thread = await getForumThread(args.thread_id as string);
    const updates: Record<string, unknown> = {};

    if (args.title !== undefined) updates.name = args.title as string;
    if (args.archived !== undefined) updates.archived = Boolean(args.archived);
    if (args.locked !== undefined) updates.locked = Boolean(args.locked);
    if (args.applied_tags !== undefined) updates.appliedTags = args.applied_tags as string[];

    const updated = await thread.edit(updates);
    return text(serializeForumThread(updated));
  },
};

export const forumsModule: ToolModule = { definitions, handlers };
