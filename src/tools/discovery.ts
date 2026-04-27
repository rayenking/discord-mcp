import { discord, ensureConnected } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_guilds",
    description: "List all Discord servers the bot is connected to.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "discord_get_guild_info",
    description:
      "Get detailed info about a guild: name, member count, channels, roles, boosts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_list_guilds() {
    await ensureConnected();
    const guilds = await discord.guilds.fetch();
    return text(
      guilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
      })),
    );
  },

  async discord_get_guild_info(args) {
    await ensureConnected();
    const guild = await discord.guilds.fetch(args.guild_id as string);
    const fullGuild = await guild.fetch();
    const channels = await fullGuild.channels.fetch();
    const roles = await fullGuild.roles.fetch();

    return text({
      id: fullGuild.id,
      name: fullGuild.name,
      description: fullGuild.description,
      icon: fullGuild.iconURL(),
      banner: fullGuild.bannerURL(),
      ownerId: fullGuild.ownerId,
      memberCount: fullGuild.memberCount,
      premiumTier: fullGuild.premiumTier,
      premiumSubscriptionCount: fullGuild.premiumSubscriptionCount,
      vanityURLCode: fullGuild.vanityURLCode,
      verificationLevel: fullGuild.verificationLevel,
      nsfwLevel: fullGuild.nsfwLevel,
      createdAt: fullGuild.createdAt.toISOString(),
      features: fullGuild.features,
      channels: channels
        .filter((ch) => ch !== null)
        .map((ch) => ({
          id: ch!.id,
          name: ch!.name,
          type: ch!.type,
        })),
      roles: roles
        .sort((a, b) => b.position - a.position)
        .map((r) => ({
          id: r.id,
          name: r.name,
          color: r.hexColor,
          position: r.position,
          memberCount: r.members.size,
        })),
    });
  },
};

export const discoveryModule: ToolModule = { definitions, handlers };
