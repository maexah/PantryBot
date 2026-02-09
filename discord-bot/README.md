# Runbad Discord Bot

Self-service player utilities for the Runbad Minecraft server via Discord slash commands. All responses are ephemeral (visible only to the invoking user).

## Commands

| Command | Description |
|---------|-------------|
| `/votenext` | Check when you can vote again on each site |
| `/linkstatus` | Check your Discord ↔ Minecraft link status |
| `/help` | List available commands and useful links |

Staff members (by role ID) can also query other players via an optional `player` parameter.

## Requirements

- **Node.js** 18+ (LTS recommended)
- **MySQL** 8.0+ (for audit logging and caching)
- **RunbadBotBridge** plugin running on the Minecraft server

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** → **Reset Token** → copy the token
4. Under **Privileged Gateway Intents**, leave all unchecked (not needed)
5. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
6. Use the generated URL to invite the bot to your server

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application ID from Developer Portal |
| `DISCORD_GUILD_ID` | No | Guild ID for instant command deployment (dev) |
| `BRIDGE_URL` | Yes | URL of RunbadBotBridge API (default: `http://127.0.0.1:9585`) |
| `BRIDGE_TOKEN` | Yes | Shared secret matching the plugin's `api.token` config |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | MySQL port (default: 3306) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `STAFF_ROLE_IDS` | No | Comma-separated Discord role IDs for staff commands |
| `DYNAMIC_COMMANDS_PATH` | No | Path to dynamic commands YAML config |

### 3. Install Dependencies

```bash
npm install
```

### 4. Create MySQL Database

```sql
CREATE DATABASE runbadbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'runbadbot'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON runbadbot.* TO 'runbadbot'@'localhost';
FLUSH PRIVILEGES;
```

Tables are created automatically on first run.

### 5. Deploy Slash Commands

```bash
# Guild-only (instant, for development):
node src/deploy-commands.js

# Global (takes up to 1 hour):
node src/deploy-commands.js --global
```

Re-run this whenever you add or change command definitions.

### 6. Start the Bot

```bash
node src/index.js
```

## Running in Production

### PM2 (Recommended for Bloom.host)

```bash
npm install -g pm2
pm2 start src/index.js --name runbad-bot
pm2 save
pm2 startup
```

### systemd

```ini
[Unit]
Description=Runbad Discord Bot
After=network.target mysql.service

[Service]
Type=simple
User=minecraft
WorkingDirectory=/path/to/discord-bot
EnvironmentFile=/path/to/discord-bot/.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Dynamic Commands

You can add new commands without writing code by editing `config/dynamic-commands.yml`. See that file for examples and documentation.

After editing, re-deploy commands:
```bash
node src/deploy-commands.js
```

Then restart the bot.

## Updating

```bash
git pull
npm install
node src/deploy-commands.js  # if commands changed
pm2 restart runbad-bot       # or systemctl restart runbad-bot
```

## Resource Usage

- RAM: ~80-150MB typical, <300MB peak
- CPU: Mostly idle (event-driven)
- Disk: <100MB (excluding node_modules)
