import {
  Client,
  Events,
  GatewayIntentBits,
  type Message,
} from "discord.js";
import pino from "pino";
import { createPrompt } from "./prompt.js";
import { GrokClient } from "./grok-client.js";

const logger = pino({ name: "discord-grok-bot" });
const DISCORD_MESSAGE_LIMIT = 2_000;
const channelQueues = new Map<string, Promise<void>>();

export function createDiscordClient(
  token: string,
  grok: GrokClient,
): Client<true> | Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(
      { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size },
      "Discord bot is ready",
    );
  });

  client.on(Events.MessageCreate, (message) => {
    if (!shouldRespond(message, client.user?.id)) {
      return;
    }

    const previous = channelQueues.get(message.channelId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => respondToMessage(message, client.user!.id, grok))
      .catch((error: unknown) => {
        logger.error({ err: error }, "Failed to handle Discord message");
      })
      .finally(() => {
        if (channelQueues.get(message.channelId) === current) {
          channelQueues.delete(message.channelId);
        }
      });

    channelQueues.set(message.channelId, current);
  });

  void client.login(token);
  return client;
}

function shouldRespond(message: Message, botId: string | undefined): boolean {
  return Boolean(
    botId &&
      message.inGuild() &&
      !message.author.bot &&
      !message.webhookId &&
      message.mentions.users.has(botId),
  );
}

async function respondToMessage(
  message: Message,
  botId: string,
  grok: GrokClient,
): Promise<void> {
  const channel = message.channel;
  if (
    !channel.isTextBased() ||
    !("messages" in channel) ||
    !("sendTyping" in channel) ||
    !("send" in channel)
  ) {
    return;
  }

  await channel.sendTyping();
  const historyCollection = await channel.messages.fetch({
    limit: 20,
    before: message.id,
  });
  const history = Array.from(historyCollection.values());
  const answer = await grok.complete(createPrompt(message, history, botId));
  const chunks = splitForDiscord(answer);

  await message.reply({
    content: chunks[0],
    allowedMentions: { parse: [], repliedUser: false },
  });

  for (const chunk of chunks.slice(1)) {
    await channel.send({
      content: chunk,
      allowedMentions: { parse: [] },
    });
  }
}

function splitForDiscord(content: string): string[] {
  const chunks: string[] = [];
  let remaining = content.trim();

  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    const window = remaining.slice(0, DISCORD_MESSAGE_LIMIT);
    const splitAt = Math.max(
      window.lastIndexOf("\n"),
      window.lastIndexOf(" "),
      1,
    );
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks.length > 0 ? chunks : ["Je n'ai pas pu générer de réponse."];
}