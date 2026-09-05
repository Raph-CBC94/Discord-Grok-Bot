export type BotConfig = {
  discordToken: string;
  grokApiKeys: string[];
  grokModel: string;
  grokBaseUrl: string;
  port: number;
  requestTimeoutMs: number;
};

function requiredSecret(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readApiKeys(): string[] {
  const individualKeys = Array.from({ length: 10 }, (_, index) =>
    process.env[`GROK_API_KEY_${index + 1}`]?.trim(),
  ).filter((key): key is string => Boolean(key));

  const groupedKeys =
    process.env.GROK_API_KEYS?.split(",")
      .map((key) => key.trim())
      .filter(Boolean) ?? [];

  return [...new Set([...individualKeys, ...groupedKeys])];
}

export function loadConfig(): BotConfig {
  const grokApiKeys = readApiKeys();
  if (grokApiKeys.length === 0) {
    throw new Error(
      "At least one Grok key is required: set GROK_API_KEY_1 (and optionally _2 through _10).",
    );
  }

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
  }

  return {
    discordToken: requiredSecret("DISCORD_BOT_TOKEN"),
    grokApiKeys,
    grokModel: process.env.GROK_MODEL?.trim() || "grok-3-mini",
    grokBaseUrl: (
      process.env.GROK_BASE_URL?.trim() ||
      "https://api.x.ai/v1/chat/completions"
    ).replace(/\/+$/, ""),
    port,
    requestTimeoutMs: Number(process.env.GROK_REQUEST_TIMEOUT_MS ?? 45_000),
  };
}