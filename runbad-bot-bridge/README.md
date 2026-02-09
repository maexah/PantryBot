# RunbadBotBridge — Paper Plugin

A secure, localhost-only HTTP API bridge that exposes read-only Minecraft server data to the Runbad Discord bot. No command execution — purely data queries.

## Features

- **Discord ↔ Minecraft link resolution** via DiscordSRV API
- **Vote cooldown data** via VotingPlugin API
- **PlaceholderAPI evaluation** for arbitrary (allowlisted) placeholders
- Rate limiting, token auth, input validation
- Zero external dependencies beyond the JDK

## Requirements

- **Paper/Purpur** 1.20.x+ (Java 17+)
- **DiscordSRV** (required — used for account linking)
- **VotingPlugin** (optional — needed for `/votenext`)
- **PlaceholderAPI** (optional — needed for dynamic commands)

## Installation

1. Place `RunbadBotBridge-1.0.0.jar` in your server's `plugins/` folder
2. Start the server once to generate the config
3. Edit `plugins/RunbadBotBridge/config.yml`:
   - Set `api.token` to a strong random secret
   - Ensure `api.host` is `127.0.0.1` (unless bot runs on a different machine)
4. Restart the server

## Configuration

```yaml
api:
  host: "127.0.0.1"    # Bind address
  port: 9585            # API port
  token: "YOUR_SECRET"  # Must match bot's BRIDGE_TOKEN env var

rate-limit:
  max-per-minute: 60
  max-per-second: 10

cache:
  link-ttl: 60          # Link cache TTL (seconds)
  vote-ttl: 15          # Vote cache TTL (seconds)
  placeholder-ttl: 10   # Placeholder cache TTL (seconds)

logging:
  log-requests: true
  log-bodies: false
```

## API Endpoints

### `GET /health`
No auth required. Returns server status and integration availability.

```json
{
  "ok": true,
  "timestamp": "2025-01-15T12:00:00Z",
  "versions": { "bridge": "1.0.0", "server": "Paper 1.20.4" },
  "integrations": { "discordsrv": true, "votingplugin": true, "placeholderapi": true }
}
```

### `GET /v1/link/resolve?discord_id=123456789`
Resolves a Discord user ID to a linked Minecraft account.

```json
{
  "linked": true,
  "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  "name": "Notch"
}
```

### `GET /v1/vote/next?uuid=069a79f4-...`
Returns per-site vote cooldown data.

```json
{
  "uuid": "069a79f4-...",
  "sites": [
    {
      "siteName": "PMC",
      "readyNow": false,
      "nextVoteEpoch": 1705334400,
      "nextVoteISO": "2025-01-15T16:00:00Z",
      "remainingSeconds": 3600,
      "voteUrl": "https://planetminecraft.com/..."
    }
  ],
  "queriedAt": 1705330800
}
```

### `POST /v1/placeholders/eval`
Evaluates PlaceholderAPI placeholders as a specific player.

**Request:**
```json
{
  "uuid": "069a79f4-...",
  "placeholders": ["%vault_eco_balance%", "%statistic_hours_played%"]
}
```

**Response:**
```json
{
  "uuid": "069a79f4-...",
  "values": {
    "%vault_eco_balance%": "1234.56",
    "%statistic_hours_played%": "42"
  }
}
```

**Security:** Placeholders matching `%server_command_%`, `%javascript_%`, `%math_%`, `%pinger_%` are blocked. Max 20 placeholders per request.

## In-Game Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/bridgestatus` | `runbadbridge.admin` | Show bridge status and integration availability |

## How It Works

### DiscordSRV Integration
Uses `DiscordSRV.getPlugin().getAccountLinkManager().getUuid(discordId)` to resolve Discord-to-Minecraft links. This reads directly from DiscordSRV's link database — no commands are executed.

### VotingPlugin Integration
Uses `VotingPluginMain.getPlugin().getVotingPluginUserManager().getVotingPluginUser(uuid)` and `VoteSite.getVoteDelay()` to calculate next eligible vote times per site. All data is read through the VotingPlugin Java API.

### PlaceholderAPI Integration
Uses `PlaceholderAPI.setPlaceholders(offlinePlayer, text)` to evaluate placeholders as a specific player. The player does not need to be online.

## Building from Source

```bash
# Place VotingPlugin.jar in libs/ directory
mkdir -p libs && cp /path/to/VotingPlugin.jar libs/

# Build
./gradlew build

# Output: build/libs/RunbadBotBridge-1.0.0.jar
```

Note: The build requires VotingPlugin.jar as a compile-only dependency since it's not in any public Maven repository. Download it from [the VotingPlugin page](https://www.spigotmc.org/resources/votingplugin.15358/).
