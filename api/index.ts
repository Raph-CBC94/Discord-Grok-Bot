import { createDiscordClient } from "../services/discord-bot/src/discord-bot.js";
import { loadConfig } from "../services/discord-bot/src/config.js";
import { GrokClient } from "../services/discord-bot/src/grok-client.js";

type Request = {
  method?: string;
};

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
};

let startup: Promise<void> | undefined;

async function startBot(): Promise<void> {
  const config = loadConfig();
  const grok = new GrokClient(
    config.grokApiKeys,
    config.grokModel,
    config.grokBaseUrl,
    config.requestTimeoutMs,
  );
  const client = createDiscordClient(config.discordToken, grok, {
    autoLogin: false,
  });

  await client.login(config.discordToken);
}

export default async function handler(request: Request, response: Response) {
  if (request.method !== "GET" && request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!startup) {
    startup = startBot().catch((error: unknown) => {
      startup = undefined;
      throw error;
    });
  }

  try {
    await startup;
    response.status(200).json({
      ok: true,
      discord: "connected",
      message:
        "Le bot a été démarré par cette invocation Vercel. Ce fonctionnement est uniquement adapté à un test.",
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      discord: "disconnected",
      error: error instanceof Error ? error.message : "Unknown startup error",
    });
  }
}
