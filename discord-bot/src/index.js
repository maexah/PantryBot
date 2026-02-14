const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./utils/command-loader');
const { loadDynamicCommands } = require('./dynamic/dynamic-loader');
const { initDatabase } = require('./services/database');
const { logAudit } = require('./services/audit');
const { checkHealth } = require('./services/bridge');
const { register: registerRoleMentionEcho } = require('./listeners/role-mention-echo');
const path = require('path');

// Validate required env vars
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'BRIDGE_URL', 'BRIDGE_TOKEN'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

async function main() {
    console.log('[Bot] Starting Runbad Bot...');

    // Initialize database
    try {
        await initDatabase();
        console.log('[Bot] Database initialized.');
    } catch (err) {
        console.error('[Bot] Database init failed (non-fatal, continuing without DB):', err.message);
    }

    // Check bridge connectivity
    try {
        const health = await checkHealth();
        console.log(`[Bot] Bridge health check OK — integrations: DiscordSRV=${health.integrations?.discordsrv}, VotingPlugin=${health.integrations?.votingplugin}, PlaceholderAPI=${health.integrations?.placeholderapi}`);
    } catch (err) {
        const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : '';
        console.error(`[Bot] Bridge health check FAILED: ${err.message}${cause}`);
        console.error('[Bot] WARNING: Bridge is unreachable at ' + (process.env.BRIDGE_URL || 'http://127.0.0.1:9585') + ' — commands that need the Minecraft server will not work.');
    }

    // Load static commands
    const staticCommands = loadCommands(path.join(__dirname, 'commands'));
    for (const cmd of staticCommands) {
        client.commands.set(cmd.data.name, cmd);
        console.log(`[Bot] Loaded command: /${cmd.data.name}`);
    }

    // Load dynamic commands
    const dynamicConfigPath = process.env.DYNAMIC_COMMANDS_PATH || path.join(__dirname, '..', 'config', 'dynamic-commands.yml');
    try {
        const dynamicCommands = loadDynamicCommands(dynamicConfigPath);
        for (const cmd of dynamicCommands) {
            client.commands.set(cmd.data.name, cmd);
            console.log(`[Bot] Loaded dynamic command: /${cmd.data.name}`);
        }
    } catch (err) {
        console.warn('[Bot] No dynamic commands loaded:', err.message);
    }

    // Register message listeners
    registerRoleMentionEcho(client);

    // Handle interactions
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);

            // Audit log (fire-and-forget)
            logAudit({
                discordUserId: interaction.user.id,
                commandName: interaction.commandName,
                success: true,
            }).catch(() => {});
        } catch (error) {
            console.error(`[Bot] Error executing /${interaction.commandName}:`, error);

            // Audit log failure
            logAudit({
                discordUserId: interaction.user.id,
                commandName: interaction.commandName,
                success: false,
                error: error.message,
            }).catch(() => {});

            const errorMessage = 'Something went wrong. Please try again later.';
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError) {
                console.error('[Bot] Failed to send error response:', replyError.message);
            }
        }
    });

    client.once('ready', () => {
        console.log(`[Bot] Logged in as ${client.user.tag}`);
        console.log(`[Bot] Serving ${client.commands.size} commands`);
        console.log(`[Bot] Intents bitmask: ${client.options.intents.bitfield}`);
    });

    // Temporary debug: confirm messageCreate events are received
    client.on('messageCreate', (msg) => {
        console.log(`[DEBUG] messageCreate: author=${msg.author.tag} bot=${msg.author.bot} content="${msg.content.slice(0, 80)}"`);
    });

    await client.login(process.env.DISCORD_TOKEN);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[Bot] Shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[Bot] Shutting down...');
    client.destroy();
    process.exit(0);
});

main().catch((err) => {
    console.error('[Bot] Fatal error:', err);
    process.exit(1);
});
