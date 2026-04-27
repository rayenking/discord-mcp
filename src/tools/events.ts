import { GuildScheduledEventEntityType, GuildScheduledEventStatus } from "discord.js";
import { discord, ensureConnected, getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeEvent(event: import("discord.js").GuildScheduledEvent) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    scheduledStartTime: event.scheduledStartAt?.toISOString() ?? null,
    scheduledEndTime: event.scheduledEndAt?.toISOString() ?? null,
    status: GuildScheduledEventStatus[event.status],
    entityType: GuildScheduledEventEntityType[event.entityType],
    channelId: event.channelId,
    location: event.entityMetadata?.location ?? null,
    creatorId: event.creatorId,
    userCount: event.userCount ?? null,
    image: event.coverImageURL(),
  };
}

const ENTITY_TYPE_MAP: Record<string, GuildScheduledEventEntityType> = {
  VOICE: GuildScheduledEventEntityType.Voice,
  STAGE_INSTANCE: GuildScheduledEventEntityType.StageInstance,
  EXTERNAL: GuildScheduledEventEntityType.External,
};

const STATUS_MAP: Record<string, GuildScheduledEventStatus> = {
  SCHEDULED: GuildScheduledEventStatus.Scheduled,
  ACTIVE: GuildScheduledEventStatus.Active,
  COMPLETED: GuildScheduledEventStatus.Completed,
  CANCELED: GuildScheduledEventStatus.Canceled,
};

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_scheduled_events",
    description: "List all scheduled events in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_get_scheduled_event",
    description: "Get detailed info about a specific scheduled event.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        event_id: { type: "string", description: "The event ID." },
      },
      required: ["guild_id", "event_id"],
    },
  },
  {
    name: "discord_create_scheduled_event",
    description:
      "Create a scheduled event in a guild. Use entity_type 'VOICE' or 'STAGE_INSTANCE' with a channel_id, or 'EXTERNAL' with a location and scheduled_end_time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        name: { type: "string", description: "Event name." },
        entity_type: {
          type: "string",
          description: "'VOICE', 'STAGE_INSTANCE', or 'EXTERNAL'.",
        },
        scheduled_start_time: {
          type: "string",
          description: "ISO 8601 datetime (e.g. '2025-06-01T20:00:00Z').",
        },
        channel_id: {
          type: "string",
          description:
            "Voice or stage channel ID. Required for VOICE/STAGE_INSTANCE.",
        },
        description: { type: "string", description: "Event description." },
        location: {
          type: "string",
          description: "Location string. Required for EXTERNAL events.",
        },
        scheduled_end_time: {
          type: "string",
          description:
            "ISO 8601 datetime. Required for EXTERNAL events.",
        },
        image: { type: "string", description: "Cover image URL." },
      },
      required: ["guild_id", "name", "entity_type", "scheduled_start_time"],
    },
  },
  {
    name: "discord_edit_scheduled_event",
    description:
      "Edit an existing scheduled event. Only provided fields are updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        event_id: { type: "string", description: "The event ID." },
        name: { type: "string", description: "New event name." },
        description: { type: "string", description: "New description." },
        channel_id: { type: "string", description: "New channel ID." },
        location: { type: "string", description: "New location." },
        scheduled_start_time: {
          type: "string",
          description: "ISO 8601 datetime.",
        },
        scheduled_end_time: {
          type: "string",
          description: "ISO 8601 datetime.",
        },
        status: {
          type: "string",
          description:
            "'SCHEDULED', 'ACTIVE', 'COMPLETED', or 'CANCELED'.",
        },
        image: { type: "string", description: "Cover image URL." },
      },
      required: ["guild_id", "event_id"],
    },
  },
  {
    name: "discord_delete_scheduled_event",
    description: "Delete a scheduled event.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        event_id: { type: "string", description: "The event ID." },
      },
      required: ["guild_id", "event_id"],
    },
  },
  {
    name: "discord_get_event_subscribers",
    description:
      "Get users who marked 'Interested' in a scheduled event.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        event_id: { type: "string", description: "The event ID." },
        limit: {
          type: "number",
          description: "1–100, default 25.",
        },
      },
      required: ["guild_id", "event_id"],
    },
  },
  {
    name: "discord_create_event_invite",
    description: "Create an invite URL linked to a scheduled event.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        event_id: { type: "string", description: "The event ID." },
        channel_id: {
          type: "string",
          description:
            "Channel for the invite. Uses the first text channel if omitted.",
        },
        max_age: {
          type: "number",
          description:
            "Invite duration in seconds (0 = never). Default 86400.",
        },
        max_uses: {
          type: "number",
          description: "Max uses (0 = unlimited). Default 0.",
        },
      },
      required: ["guild_id", "event_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_list_scheduled_events(args) {
    const guild = await getGuild(args.guild_id as string);
    const events = await guild.scheduledEvents.fetch();
    return text(events.map((e) => serializeEvent(e)));
  },

  async discord_get_scheduled_event(args) {
    const guild = await getGuild(args.guild_id as string);
    const event = await guild.scheduledEvents.fetch(args.event_id as string);
    return text(serializeEvent(event));
  },

  async discord_create_scheduled_event(args) {
    const guild = await getGuild(args.guild_id as string);
    const entityType = ENTITY_TYPE_MAP[args.entity_type as string];
    if (entityType === undefined) {
      throw new Error(
        `Invalid entity_type: ${args.entity_type}. Use VOICE, STAGE_INSTANCE, or EXTERNAL.`,
      );
    }

    const options: import("discord.js").GuildScheduledEventCreateOptions = {
      name: args.name as string,
      scheduledStartTime: args.scheduled_start_time as string,
      entityType,
      privacyLevel: 2, // GuildOnly
    };

    if (args.description)
      options.description = args.description as string;
    if (args.image) options.image = args.image as string;

    if (entityType === GuildScheduledEventEntityType.External) {
      if (!args.location)
        throw new Error("EXTERNAL events require a location.");
      if (!args.scheduled_end_time)
        throw new Error("EXTERNAL events require scheduled_end_time.");
      options.entityMetadata = { location: args.location as string };
      options.scheduledEndTime = args.scheduled_end_time as string;
    } else {
      if (!args.channel_id)
        throw new Error(
          `${args.entity_type} events require a channel_id.`,
        );
      options.channel = args.channel_id as string;
    }

    const event = await guild.scheduledEvents.create(options);
    return text(serializeEvent(event));
  },

  async discord_edit_scheduled_event(args) {
    const guild = await getGuild(args.guild_id as string);
    const event = await guild.scheduledEvents.fetch(
      args.event_id as string,
    );

    const options: Record<string, unknown> = {};

    if (args.name !== undefined) options.name = args.name as string;
    if (args.description !== undefined)
      options.description = args.description as string;
    if (args.channel_id !== undefined)
      options.channel = args.channel_id as string;
    if (args.scheduled_start_time !== undefined)
      options.scheduledStartTime = args.scheduled_start_time as string;
    if (args.scheduled_end_time !== undefined)
      options.scheduledEndTime = args.scheduled_end_time as string;
    if (args.image !== undefined) options.image = args.image as string;
    if (args.location !== undefined) {
      options.entityMetadata = { location: args.location as string };
    }
    if (args.status !== undefined) {
      const status = STATUS_MAP[args.status as string];
      if (status === undefined) {
        throw new Error(`Invalid status: ${args.status}`);
      }
      options.status = status;
    }

    const updated = await event.edit(options as Parameters<typeof event.edit>[0]);
    return text(serializeEvent(updated));
  },

  async discord_delete_scheduled_event(args) {
    const guild = await getGuild(args.guild_id as string);
    const event = await guild.scheduledEvents.fetch(
      args.event_id as string,
    );
    await event.delete();
    return text({ success: true, deletedEventId: args.event_id });
  },

  async discord_get_event_subscribers(args) {
    const guild = await getGuild(args.guild_id as string);
    const event = await guild.scheduledEvents.fetch(
      args.event_id as string,
    );
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);
    const subscribers = await event.fetchSubscribers({ limit });
    return text(
      subscribers.map((s) => ({
        userId: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName,
        bot: s.user.bot,
      })),
    );
  },

  async discord_create_event_invite(args) {
    const guild = await getGuild(args.guild_id as string);
    await ensureConnected();

    let channelId = args.channel_id as string | undefined;
    if (!channelId) {
      const channels = await guild.channels.fetch();
      const firstText = channels.find(
        (ch) => ch !== null && ch.isTextBased() && !ch.isThread(),
      );
      if (!firstText) throw new Error("No text channel found in guild.");
      channelId = firstText.id;
    }

    const channel = await discord.channels.fetch(channelId);
    if (!channel || !("createInvite" in channel)) {
      throw new Error(`Channel ${channelId} does not support invites.`);
    }

    const invite = await (
      channel as import("discord.js").TextChannel
    ).createInvite({
      maxAge: Number(args.max_age) || 86400,
      maxUses: Number(args.max_uses) || 0,
      targetType: 2, // GuildScheduledEvent target
      reason: `Invite for scheduled event ${args.event_id}`,
    });

    return text({
      code: invite.code,
      url: invite.url,
      channelId: invite.channelId,
      eventId: args.event_id,
      maxAge: invite.maxAge,
      maxUses: invite.maxUses,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
    });
  },
};

export const eventsModule: ToolModule = { definitions, handlers };
