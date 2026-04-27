import { Client, GatewayIntentBits, TextChannel } from "discord.js";

export const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
  ],
});

let connectPromise: Promise<void> | null = null;

export async function ensureConnected(): Promise<void> {
  if (discord.isReady()) return;

  if (connectPromise) {
    await connectPromise;
    return;
  }

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error("DISCORD_TOKEN environment variable is required");
  }

  connectPromise = new Promise<void>((resolve, reject) => {
    discord.once("ready", () => {
      console.error(`✅ Discord bot connected as ${discord.user?.tag}`);
      resolve();
    });
    discord.login(token).catch((err) => {
      connectPromise = null;
      reject(err);
    });
  });

  await connectPromise;
}

export async function getTextChannel(id: string): Promise<TextChannel> {
  await ensureConnected();
  const channel = await discord.channels.fetch(id);
  if (!channel || !(channel instanceof TextChannel)) {
    throw new Error(`Channel ${id} is not a text channel or does not exist`);
  }
  return channel;
}

export async function getGuild(id: string) {
  await ensureConnected();
  const guild = await discord.guilds.fetch(id);
  if (!guild) {
    throw new Error(`Guild ${id} not found`);
  }
  return guild;
}
