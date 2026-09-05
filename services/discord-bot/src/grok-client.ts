import pino from "pino";

const logger = pino({ name: "discord-grok-bot" });

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GrokResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type GrokError = Error & {
  status?: number;
  retryable?: boolean;
};

export class GrokClient {
  private cursor = 0;

  constructor(
    private readonly apiKeys: string[],
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    const keysInOrder = this.keysInRoundRobinOrder();
    let lastError: GrokError | undefined;

    for (const [index, apiKey] of keysInOrder.entries()) {
      try {
        return await this.request(apiKey, messages);
      } catch (error) {
        lastError = toGrokError(error);
        const isLastKey = index === keysInOrder.length - 1;

        if (!lastError.retryable || isLastKey) {
          break;
        }

        logger.warn(
          { status: lastError.status, keySlot: this.slotFor(apiKey) },
          "Grok key failed; trying the next configured key",
        );
      }
    }

    throw new Error(
      lastError?.retryable
        ? "All configured Grok keys are temporarily unavailable."
        : "Grok rejected the request.",
    );
  }

  private keysInRoundRobinOrder(): string[] {
    const start = this.cursor;
    this.cursor = (this.cursor + 1) % this.apiKeys.length;

    return this.apiKeys.map(
      (_, offset) => this.apiKeys[(start + offset) % this.apiKeys.length],
    );
  }

  private slotFor(apiKey: string): number {
    return this.apiKeys.indexOf(apiKey) + 1;
  }

  private async request(
    apiKey: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          max_tokens: 700,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(
          `Grok request failed with status ${response.status}`,
        ) as GrokError;
        error.status = response.status;
        error.retryable =
          response.status === 401 ||
          response.status === 403 ||
          response.status === 408 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status >= 500;
        throw error;
      }

      const payload = (await response.json()) as GrokResponse;
      const content = payload.choices?.[0]?.message?.content;
      const text =
        typeof content === "string"
          ? content.trim()
          : content
              ?.map((part) => part.text ?? "")
              .join("")
              .trim();

      if (!text) {
        throw new Error("Grok returned an empty response.");
      }

      return text;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new Error("Grok request timed out") as GrokError;
        timeoutError.retryable = true;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toGrokError(error: unknown): GrokError {
  if (error instanceof Error) {
    return error as GrokError;
  }

  return new Error("Unknown Grok error") as GrokError;
}