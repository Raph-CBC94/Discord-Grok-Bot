---
name: Discord bot runtime
description: Operational constraints for the Discord Gateway worker and its deployment.
---

The Discord assistant must run as a long-lived process rather than as a Vercel
Function. Reading ordinary message mentions and recent channel history requires
the Discord Gateway and the privileged Message Content intent.

**Why:** Discord rejected the first live connection with “Used disallowed
intents” when the intent was not enabled. Vercel serverless execution also
cannot keep the Gateway connection alive.

**How to apply:** Keep the worker deployable on Railway, Render, Fly.io, or
another long-running host. In the Discord Developer Portal, enable Message
Content Intent before live validation. Store the bot token and Grok keys only
as host secrets.