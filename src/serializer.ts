import type { Message } from "discord.js";
import type {
  SerializedMessage,
  SerializedAttachment,
  SerializedAuthor,
  SerializedEmbed,
  SerializedSticker,
  SerializedReaction,
  SerializedReply,
} from "./types.js";

function serializeAttachment(a: Message["attachments"] extends Map<string, infer V> ? V : never): SerializedAttachment {
  return {
    id: a.id,
    name: a.name,
    url: a.url,
    proxyURL: a.proxyURL,
    contentType: a.contentType,
    size: a.size,
    width: a.width,
    height: a.height,
    spoiler: a.spoiler,
  };
}

function serializeEmbed(e: Message["embeds"][number]): SerializedEmbed {
  return {
    title: e.title,
    description: e.description,
    url: e.url,
    timestamp: e.timestamp,
    color: e.color,
    author: e.author
      ? { name: e.author.name, url: e.author.url, iconURL: e.author.iconURL ?? undefined }
      : null,
    footer: e.footer
      ? { text: e.footer.text, iconURL: e.footer.iconURL ?? undefined }
      : null,
    fields: e.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline ?? false })),
    image: e.image ? { url: e.image.url, width: e.image.width, height: e.image.height } : null,
    thumbnail: e.thumbnail
      ? { url: e.thumbnail.url, width: e.thumbnail.width, height: e.thumbnail.height }
      : null,
  };
}

function serializeSticker(s: Message["stickers"] extends Map<string, infer V> ? V : never): SerializedSticker {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    format: String(s.format),
    url: s.url,
  };
}

function serializeReaction(r: Message["reactions"]["cache"] extends Map<string, infer V> ? V : never): SerializedReaction {
  return {
    emoji: {
      id: r.emoji.id,
      name: r.emoji.name,
      identifier: r.emoji.identifier,
    },
    count: r.count,
    me: r.me,
  };
}

function serializeAuthor(user: Message["author"]): SerializedAuthor {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bot: user.bot,
  };
}

async function serializeReply(message: Message): Promise<SerializedReply | null> {
  if (!message.reference?.messageId) return null;

  try {
    const referenced = await message.fetchReference();
    return {
      id: referenced.id,
      author: serializeAuthor(referenced.author),
      content: referenced.content.slice(0, 200),
    };
  } catch {
    return null;
  }
}

export async function serializeMessage(message: Message): Promise<SerializedMessage> {
  const replyTo = await serializeReply(message);

  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId ?? null,
    author: serializeAuthor(message.author),
    content: message.content,
    timestamp: message.createdAt.toISOString(),
    editedTimestamp: message.editedAt?.toISOString() ?? null,
    pinned: message.pinned,
    attachments: message.attachments.map(serializeAttachment),
    embeds: message.embeds.map(serializeEmbed),
    stickers: message.stickers.map(serializeSticker),
    reactions: message.reactions.cache.map(serializeReaction),
    replyTo,
  };
}
