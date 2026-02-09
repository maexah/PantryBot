# PantryBot — Runbad Minecraft Server Discord Bot

A self-service Discord bot with a secure Minecraft server bridge for the Runbad community. Players can check vote cooldowns, link status, and more — all through private, ephemeral slash commands.

## Architecture

```
┌──────────────────┐         HTTP (localhost:9585)         ┌──────────────────────┐
│                  │ ──────────────────────────────────────→│                      │
│  Discord Bot     │         Bearer token auth             │  RunbadBotBridge      │
│  (Node.js)       │ ←──────────────────────────────────── │  (Paper Plugin)       │
│                  │         JSON responses                 │                      │
└──────────────────┘                                       └──────────┬───────────┘
       │                                                              │
       │ Slash commands                                    ┌──────────┼───────────┐
       │ (ephemeral)                                       │          │           │
       ▼                                                   ▼          ▼           ▼
  ┌─────────┐                                        DiscordSRV  VotingPlugin  PlaceholderAPI
  │ Discord │                                        (linking)   (vote data)  (stats/data)
  └─────────┘
```

## Components

| Component | Directory | Description |
|-----------|-----------|-------------|
| **Discord Bot** | `discord-bot/` | Node.js + discord.js v14 slash command bot |
| **RunbadBotBridge** | `runbad-bot-bridge/` | Paper plugin providing a secure localhost HTTP API |

## Quick Start

### 1. Deploy the Bridge Plugin
1. Build or download `RunbadBotBridge-1.0.0.jar`
2. Place in your Paper server's `plugins/` folder
3. Configure `plugins/RunbadBotBridge/config.yml` (set a strong API token)
4. Restart the server

### 2. Deploy the Discord Bot
1. `cd discord-bot && npm install`
2. `cp .env.example .env` and fill in your credentials
3. `node src/deploy-commands.js` to register slash commands
4. `node src/index.js` to start the bot

See each component's README for detailed setup instructions.

## Security Model

- **No console commands**: The bridge only exposes read-only data queries
- **Localhost-only**: Bridge API binds to 127.0.0.1 by default
- **Token auth**: All API requests require a shared Bearer token
- **Ephemeral responses**: All bot replies are only visible to the invoking user
- **Self-service only**: Regular users can only query their own linked account
- **Staff gating**: Override commands require configured Discord role IDs
- **Rate limiting**: Per-IP request limits on the bridge API
- **Input validation**: UUID/Discord ID format validation, placeholder blocklist
- **Audit logging**: All command usage logged to MySQL
