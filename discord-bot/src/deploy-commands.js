/**
 * Deploy slash commands to Discord.
 *
 * Usage:
 *   node src/deploy-commands.js          # Deploy to guild (fast, for dev)
 *   node src/deploy-commands.js --global # Deploy globally (takes ~1 hour)
 */

const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./utils/command-loader');
const { loadDynamicCommands } = require('./dynamic/dynamic-loader');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const isGlobal = process.argv.includes('--global');

if (!token || !clientId) {
    console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
    process.exit(1);
}

async function deploy() {
    const commands = [];

    // Load static commands
    const staticCommands = loadCommands(path.join(__dirname, 'commands'));
    for (const cmd of staticCommands) {
        commands.push(cmd.data.toJSON());
        console.log(`[Deploy] Static command: /${cmd.data.name}`);
    }

    // Load dynamic commands
    const dynamicConfigPath = process.env.DYNAMIC_COMMANDS_PATH || path.join(__dirname, '..', 'config', 'dynamic-commands.yml');
    try {
        const dynamicCommands = loadDynamicCommands(dynamicConfigPath);
        for (const cmd of dynamicCommands) {
            commands.push(cmd.data.toJSON());
            console.log(`[Deploy] Dynamic command: /${cmd.data.name}`);
        }
    } catch (err) {
        console.warn('[Deploy] No dynamic commands:', err.message);
    }

    const rest = new REST().setToken(token);

    try {
        console.log(`[Deploy] Deploying ${commands.length} commands...`);

        if (isGlobal || !guildId) {
            if (!isGlobal && !guildId) {
                console.log('[Deploy] No DISCORD_GUILD_ID set, deploying globally.');
            }
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('[Deploy] Global commands deployed (may take up to 1 hour to appear).');
        } else {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log('[Deploy] Guild commands deployed (available immediately).');
        }
    } catch (error) {
        console.error('[Deploy] Failed:', error);
        process.exit(1);
    }
}

deploy();
