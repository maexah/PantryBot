/**
 * /linkstatus - Shows the user's Discord-to-Minecraft account link status.
 */

const { SlashCommandBuilder } = require('discord.js');
const { resolveLink } = require('../services/bridge');
const { createEmbed, errorEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('linkstatus')
        .setDescription('Check if your Discord account is linked to Minecraft'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const linkData = await resolveLink(interaction.user.id);

            if (linkData.linked) {
                const embed = createEmbed(
                    'Account Linked',
                    null,
                    COLORS.SUCCESS
                );
                embed.addFields(
                    { name: 'Minecraft Name', value: `\`${linkData.name}\``, inline: true },
                    { name: 'UUID', value: `\`${linkData.uuid}\``, inline: true }
                );
                embed.setDescription('Your Discord account is linked to a Minecraft account.');

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = createEmbed(
                    'Account Not Linked',
                    'Your Discord account is **not** linked to a Minecraft account.\n\n' +
                    '**How to link:**\n' +
                    '1. Join the Minecraft server\n' +
                    '2. Run `/discordsrv link` in-game\n' +
                    '3. You\'ll receive a code — send it to the DiscordSRV bot in DMs\n' +
                    '4. Once linked, you can use all bot commands!',
                    COLORS.WARNING
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            console.error('[linkstatus] Failed:', err.message, err.cause ? `(${err.cause.code || err.cause.message || err.cause})` : '');
            await interaction.editReply({
                embeds: [errorEmbed('Failed to check link status. The Minecraft server may be offline.')],
            });
        }
    },
};
