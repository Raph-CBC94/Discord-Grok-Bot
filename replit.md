# Discord Grok Bot

Bot Discord qui répond aux mentions avec Grok et utilise jusqu'à dix clés API en rotation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/discord-bot run dev` — run the Discord bot locally
- `pnpm --filter @workspace/discord-bot run build` — compile the bot for deployment
- `pnpm --filter @workspace/discord-bot run start` — start the compiled bot
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Bot secrets: `DISCORD_BOT_TOKEN` and at least `GROK_API_KEY_1`; optional keys go
  from `GROK_API_KEY_2` to `GROK_API_KEY_10`
- Optional bot env: `GROK_MODEL`, `GROK_BASE_URL`, `GROK_REQUEST_TIMEOUT_MS`,
  `PORT`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord bot: discord.js Gateway client with a long-running health server
- AI: xAI's OpenAI-compatible chat completions endpoint
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `services/discord-bot/src/main.ts` — process entry point and graceful shutdown
- `services/discord-bot/src/discord-bot.ts` — Discord mention handling, history
  retrieval, serial per-channel processing, and message splitting
- `services/discord-bot/src/grok-client.ts` — round-robin key rotation and
  retry/fallback behavior
- `services/discord-bot/README.md` — setup, intents, environment variables, and
  deployment notes

## Architecture decisions

- The bot is a long-running Gateway process; it should not be deployed as a
  Vercel Function because serverless invocations cannot maintain the Discord
  Gateway connection.
- Grok keys are read from environment variables only and are never logged or
  sent to Discord.
- Previous messages are explicitly untrusted context so conversation history
  cannot override the assistant's operating rules.

## Product

- Responds only to direct mentions of the bot in a guild channel.
- Reads up to the 20 messages immediately before the question.
- Answers briefly in the question's language and falls back across configured
  Grok keys when a key is unavailable or rate limited.

## User preferences

- The user wants a simple, clear, precise assistant response.

## Gotchas

- Enable Discord's Message Content Intent or message content and history cannot
  be read.
- Keep secrets in the host's environment configuration, never in GitHub.
- Use a long-running host such as Railway, Render, or Fly.io for the bot runtime;
  Vercel can host an unrelated HTTP endpoint but not this Gateway worker.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
