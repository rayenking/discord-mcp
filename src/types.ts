export interface SerializedAttachment {
  id: string;
  name: string;
  url: string;
  proxyURL: string;
  contentType: string | null;
  size: number;
  width: number | null;
  height: number | null;
  spoiler: boolean;
}

export interface SerializedEmbed {
  title: string | null;
  description: string | null;
  url: string | null;
  timestamp: string | null;
  color: number | null;
  author: { name: string; url?: string; iconURL?: string } | null;
  footer: { text: string; iconURL?: string } | null;
  fields: { name: string; value: string; inline: boolean }[];
  image: { url: string; width?: number; height?: number } | null;
  thumbnail: { url: string; width?: number; height?: number } | null;
}

export interface SerializedSticker {
  id: string;
  name: string;
  description: string | null;
  format: string;
  url: string;
}

export interface SerializedReaction {
  emoji: { id: string | null; name: string | null; identifier: string };
  count: number;
  me: boolean;
}

export interface SerializedAuthor {
  id: string;
  username: string;
  displayName: string;
  bot: boolean;
}

export interface SerializedReply {
  id: string;
  author: SerializedAuthor;
  content: string;
}

export interface SerializedMessage {
  id: string;
  channelId: string;
  guildId: string | null;
  author: SerializedAuthor;
  content: string;
  timestamp: string;
  editedTimestamp: string | null;
  pinned: boolean;
  attachments: SerializedAttachment[];
  embeds: SerializedEmbed[];
  stickers: SerializedSticker[];
  reactions: SerializedReaction[];
  replyTo: SerializedReply | null;
}
