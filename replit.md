# Discord Grok Bot

Bot Discord qui répond aux mentions avec Grok via l'API compatible OpenAI de xAI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/discord-bot run dev` — run the Discord bot locally
- `pnpm --filter @workspace/discord-bot run build` — compile the bot
- `pnpm --filter @workspace/discord-bot run start` — start the compiled bot
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Bot secrets: `DISCORD_TOKEN` (or `DISCORD_BOT_TOKEN`) and at least
  `GROK_API_KEY_1`
- Optional bot env: `GROK_API_KEY_2` through `GROK_API_KEY_10`, `GROK_MODEL`,
  `GROK_BASE_URL`, `GROK_REQUEST_TIMEOUT_MS`, `PORT`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Deployment test: Vercel function at `/api`, configured by `vercel.json`

## Where things live

- `services/discord-bot/src/main.ts` — long-running Discord Gateway entry point
- `services/discord-bot/src/discord-bot.ts` — mention handling and message history
- `services/discord-bot/src/grok-client.ts` — xAI requests and key fallback
- `api/index.ts` — Vercel test entry point that starts the bot on an HTTP request

## Architecture decisions

- The bot responds only to direct mentions in guild channels.
- Up to 20 previous messages are sent as untrusted context to Grok.
- Vercel is used only for a short test: a serverless invocation can stop the
  Discord Gateway connection after the response.

## Product

- Answers Discord mentions in the question's language.
- Rotates through up to ten Grok API keys when a request is unavailable or rate
  limited.
- Splits long answers at Discord's 2,000-character limit.

## User preferences

- The user wants a simple, clear, precise assistant response.

## Gotchas

- Enable Discord's Message Content Intent.
- Add secrets in Vercel or the local environment; never commit them.
- Open `/api` once after a Vercel deployment to trigger the test invocation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
