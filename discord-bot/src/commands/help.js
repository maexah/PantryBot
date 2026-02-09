/**
 * /help - Lists all available commands and quick links.
 */

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List available commands and useful links'),

    async execute(interaction) {
        const embed = createEmbed(
            'Runbad Bot — Help',
            'Self-service utilities for the Runbad Minecraft server.',
            COLORS.PRIMARY
        );

        embed.addFields(
            {
                name: '📋 Commands',
                value: [
                    '`/votenext` — Check when you can vote again on each site',
                    '`/linkstatus` — Check your Discord ↔ Minecraft link status',
                    '`/help` — Show this help message',
                ].join('\n'),
                inline: false,
            },
            {
                name: '🔗 Quick Links',
                value: [
                    '**Vote for us:** Check `/votenext` for vote site links',
                    '**Link account:** Use `/discordsrv link` in-game',
                ].join('\n'),
                inline: false,
            },
            {
                name: 'ℹ️ Note',
                value: 'All responses are private — only you can see them. ' +
                       'You must link your Discord and Minecraft accounts to use most commands.',
                inline: false,
            }
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
