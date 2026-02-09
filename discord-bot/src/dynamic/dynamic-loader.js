/**
 * Dynamic command loader.
 *
 * Reads a YAML config file and generates slash commands that fetch
 * PlaceholderAPI values from the bridge and display them in embeds.
 *
 * This allows server admins to define new commands without writing code.
 */

const fs = require('fs');
const YAML = require('yaml');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolveLink, evalPlaceholders } = require('../services/bridge');
const { errorEmbed, COLORS } = require('../utils/embeds');
const { isStaff } = require('../utils/staff');
const { logAudit } = require('../services/audit');

/**
 * Load dynamic commands from a YAML config file.
 * @param {string} configPath - Path to the YAML config file
 * @returns {Array} Array of command objects with data and execute
 */
function loadDynamicCommands(configPath) {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Dynamic commands config not found: ${configPath}`);
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = YAML.parse(raw);

    if (!config || !config.commands || !Array.isArray(config.commands)) {
        return [];
    }

    const commands = [];

    for (const cmdConfig of config.commands) {
        if (cmdConfig.enabled === false) {
            continue;
        }

        if (!cmdConfig.name || !cmdConfig.description) {
            console.warn(`[Dynamic] Skipping command with missing name/description`);
            continue;
        }

        const command = buildDynamicCommand(cmdConfig);
        if (command) {
            commands.push(command);
        }
    }

    return commands;
}

/**
 * Build a dynamic command from config.
 */
function buildDynamicCommand(cmdConfig) {
    const builder = new SlashCommandBuilder()
        .setName(cmdConfig.name.toLowerCase())
        .setDescription(cmdConfig.description);

    // Add staff override option if configured
    if (cmdConfig.staff_override) {
        builder.addStringOption(option =>
            option
                .setName('player')
                .setDescription('[Staff only] Look up a specific player UUID')
                .setRequired(false)
        );
    }

    return {
        data: builder,
        async execute(interaction) {
            await interaction.deferReply({ ephemeral: true });

            const playerOverride = cmdConfig.staff_override
                ? interaction.options.getString('player')
                : null;

            // Staff override check
            if (playerOverride) {
                if (!isStaff(interaction.member)) {
                    await interaction.editReply({
                        embeds: [errorEmbed('You do not have permission to look up other players.')],
                    });
                    return;
                }
                logAudit({
                    discordUserId: interaction.user.id,
                    commandName: `${cmdConfig.name}_staff_override`,
                    success: true,
                    targetUuid: playerOverride,
                }).catch(() => {});
            }

            // Resolve player
            let uuid, playerName;

            if (playerOverride) {
                uuid = playerOverride;
                playerName = playerOverride;
            } else {
                try {
                    const linkData = await resolveLink(interaction.user.id);
                    if (!linkData.linked) {
                        const embed = new EmbedBuilder()
                            .setTitle('Account Not Linked')
                            .setDescription(
                                'Your Discord account is not linked to a Minecraft account.\n\n' +
                                'Use `/discordsrv link` in-game to link your account.'
                            )
                            .setColor(COLORS.WARNING)
                            .setTimestamp();
                        await interaction.editReply({ embeds: [embed] });
                        return;
                    }
                    uuid = linkData.uuid;
                    playerName = linkData.name;
                } catch (err) {
                    console.error(`[${cmdConfig.name}] Link resolve failed:`, err.message);
                    await interaction.editReply({
                        embeds: [errorEmbed('Failed to check your account link. The server may be offline.')],
                    });
                    return;
                }
            }

            // Collect all placeholders from the embed config
            const allPlaceholders = collectPlaceholders(cmdConfig.embed);

            if (allPlaceholders.length === 0) {
                await interaction.editReply({
                    embeds: [errorEmbed('This command has no placeholders configured.')],
                });
                return;
            }

            // Evaluate placeholders
            let values;
            try {
                const result = await evalPlaceholders(uuid, allPlaceholders);
                values = result.values;
            } catch (err) {
                console.error(`[${cmdConfig.name}] Placeholder eval failed:`, err.message);
                await interaction.editReply({
                    embeds: [errorEmbed('Failed to fetch data from the Minecraft server.')],
                });
                return;
            }

            // Build embed with resolved values
            const embed = buildEmbed(cmdConfig.embed, values, playerName);
            await interaction.editReply({ embeds: [embed] });
        },
    };
}

/**
 * Collect all unique placeholder strings from an embed config.
 */
function collectPlaceholders(embedConfig) {
    const placeholders = new Set();
    const placeholderRegex = /%[a-zA-Z0-9_]+%/g;

    function scan(text) {
        if (!text) return;
        const matches = text.match(placeholderRegex);
        if (matches) {
            matches.forEach(m => placeholders.add(m));
        }
    }

    scan(embedConfig.title);
    scan(embedConfig.description);

    if (embedConfig.fields) {
        for (const field of embedConfig.fields) {
            scan(field.name);
            scan(field.value);
        }
    }

    return [...placeholders];
}

/**
 * Build a Discord embed from config, replacing placeholders with values.
 */
function buildEmbed(embedConfig, values, playerName) {
    const resolve = (text) => {
        if (!text) return text;
        // Replace {{player_name}} with the player name
        text = text.replace(/\{\{player_name\}\}/g, playerName);
        // Replace placeholders with resolved values
        for (const [placeholder, value] of Object.entries(values)) {
            text = text.replaceAll(placeholder, value);
        }
        return text;
    };

    const colorValue = embedConfig.color
        ? (typeof embedConfig.color === 'string' ? parseInt(embedConfig.color.replace('#', ''), 16) : embedConfig.color)
        : COLORS.PRIMARY;

    const embed = new EmbedBuilder()
        .setColor(colorValue)
        .setTimestamp()
        .setFooter({ text: 'Runbad Bot' });

    if (embedConfig.title) {
        embed.setTitle(resolve(embedConfig.title));
    }

    if (embedConfig.description) {
        embed.setDescription(resolve(embedConfig.description));
    }

    if (embedConfig.fields) {
        for (const field of embedConfig.fields) {
            embed.addFields({
                name: resolve(field.name),
                value: resolve(field.value),
                inline: field.inline ?? true,
            });
        }
    }

    if (embedConfig.thumbnail) {
        // Support Crafatar URLs with player UUID
        const thumbnailUrl = resolve(embedConfig.thumbnail).replace('{{uuid}}', '');
        embed.setThumbnail(thumbnailUrl);
    }

    return embed;
}

module.exports = { loadDynamicCommands };
