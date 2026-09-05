# Bot Discord Grok

Bot Discord qui répond uniquement lorsqu'il est mentionné avec `@bot`. Pour
chaque question, il récupère les 20 messages précédents du même salon afin de
fournir le contexte à Grok.

## Fonctionnement

- Les clés `GROK_API_KEY_1` à `GROK_API_KEY_10` sont détectées automatiquement.
- Chaque requête commence avec la clé suivante (round-robin).
- Si la clé sélectionnée est limitée, refusée ou indisponible, la requête essaie
  les autres clés configurées, sans exposer l'erreur ni la clé dans Discord.
- Les réponses sont découpées proprement à 2 000 caractères, la limite Discord.
- Les mentions présentes dans la réponse Grok sont désactivées pour éviter les
  notifications involontaires.
- Les messages précédents sont traités comme du contexte non fiable : ils ne
  peuvent pas modifier les règles internes du bot.

## Variables d'environnement

Obligatoires :

```text
DISCORD_TOKEN=...
GROK_API_KEY_1=...
```

Optionnelles :

```text
GROK_API_KEY_2=...
GROK_API_KEY_3=...
GROK_API_KEY_4=...
GROK_API_KEY_5=...
GROK_API_KEY_6=...
GROK_API_KEY_7=...
GROK_API_KEY_8=...
GROK_API_KEY_9=...
GROK_API_KEY_10=...
GROK_MODEL=grok-3-mini
GROK_BASE_URL=https://api.x.ai/v1/chat/completions
GROK_REQUEST_TIMEOUT_MS=45000
PORT=3000
```

`GROK_API_KEYS` peut aussi contenir une liste séparée par des virgules, ce qui
est pratique pour certains hébergeurs.

`DISCORD_BOT_TOKEN` est également accepté comme nom alternatif à
`DISCORD_TOKEN`.

## Configuration Discord obligatoire

Dans le portail développeur Discord :

1. Créer une application puis un bot.
2. Activer **Message Content Intent** dans les intents privilégiés.
3. Inviter le bot avec les scopes `bot` et `applications.commands`.
4. Accorder au minimum les permissions `View Channel`, `Read Message History`,
   `Send Messages` et `Add Reactions` n'est pas nécessaire.

Le bot utilise le Gateway Discord, car une mention dans un message classique
nécessite une connexion persistante.

## Lancer localement

```bash
pnpm install
pnpm --filter @workspace/discord-bot run dev
```

Vérification de santé : `GET /healthz`.

## Déploiement

Ce service ne doit pas être déployé comme une Vercel Function : Vercel arrête
les fonctions et ne maintient pas la connexion Gateway Discord. Le dépôt peut
rester sur GitHub, mais le service du bot doit être déployé sur un hébergeur
qui maintient un processus long-running, par exemple Railway, Render ou Fly.io.

Commande de build :

```bash
pnpm --filter @workspace/discord-bot run build
```

Commande de démarrage :

```bash
pnpm --filter @workspace/discord-bot run start
```

Configurer les secrets dans les variables d'environnement de l'hébergeur,
jamais dans GitHub.

## Test Vercel

Une route `api/index.ts` est fournie à la racine pour lancer le bot lors d'une
invocation HTTP Vercel. Ouvrir `/api` démarre la connexion Discord dans
l'instance serverless courante. Cette version sert uniquement à un test court :
Vercel peut arrêter l'instance après la réponse et le bot peut alors se
déconnecter.