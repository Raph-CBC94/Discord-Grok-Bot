import { loadConfig } from "./config.js";
import { createDiscordClient } from "./discord-bot.js";
import { GrokClient } from "./grok-client.js";
import { startHealthServer } from "./health-server.js";
import pino from "pino";

const logger = pino({ name: "discord-grok-bot" });
const config = loadConfig();
const grok = new GrokClient(
  config.grokApiKeys,
  config.grokModel,
  config.grokBaseUrl,
  config.requestTimeoutMs,
);
const client = createDiscordClient(config.discordToken, grok);
const healthServer = startHealthServer(config.port);

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down");
  healthServer.close();
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));