/**
 * /votenext - Shows vote cooldown timers for all configured vote sites.
 *
 * Regular users: queries their own linked MC account.
 * Staff: can optionally specify a player UUID/name to query.
 */

const { SlashCommandBuilder } = require('discord.js');
const { resolveLink, getVoteNext } = require('../services/bridge');
const { createEmbed, errorEmbed, COLORS, formatDuration } = require('../utils/embeds');
const { isStaff } = require('../utils/staff');
const { logAudit } = require('../services/audit');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('votenext')
        .setDescription('Check when you can vote again on each site')
        .addStringOption(option =>
            option
                .setName('player')
                .setDescription('[Staff only] Look up a specific player UUID')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const playerOverride = interaction.options.getString('player');

        // If player override is specified, check staff permission
        if (playerOverride) {
            if (!isStaff(interaction.member)) {
                await interaction.editReply({
                    embeds: [errorEmbed('You do not have permission to look up other players.')],
                });
                return;
            }

            // Staff lookup audit
            logAudit({
                discordUserId: interaction.user.id,
                commandName: 'votenext_staff_override',
                success: true,
                targetUuid: playerOverride,
            }).catch(() => {});
        }

        let uuid, playerName;

        if (playerOverride) {
            // Staff override: use provided UUID directly
            uuid = playerOverride;
            playerName = playerOverride; // Will show UUID if no name available
        } else {
            // Regular user: resolve from Discord link
            try {
                const linkData = await resolveLink(interaction.user.id);

                if (!linkData.linked) {
                    const embed = createEmbed(
                        'Account Not Linked',
                        'Your Discord account is not linked to a Minecraft account.\n\n' +
                        '**How to link:**\n' +
                        '1. Join the Minecraft server\n' +
                        '2. Run `/discordsrv link` in-game\n' +
                        '3. Follow the instructions to complete linking\n\n' +
                        'Once linked, you can use this command to check your vote timers.',
                        COLORS.WARNING
                    );
                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                uuid = linkData.uuid;
                playerName = linkData.name;
            } catch (err) {
                console.error('[votenext] Link resolve failed:', err.message, err.cause ? `(${err.cause.code || err.cause.message || err.cause})` : '');
                await interaction.editReply({
                    embeds: [errorEmbed('Failed to check your account link. The Minecraft server may be offline.')],
                });
                return;
            }
        }

        // Get vote data
        try {
            const voteData = await getVoteNext(uuid);

            if (!voteData.sites || voteData.sites.length === 0) {
                await interaction.editReply({
                    embeds: [createEmbed(
                        'No Vote Sites',
                        'No vote sites are currently configured on the server.',
                        COLORS.WARNING
                    )],
                });
                return;
            }

            // Build embed
            const embed = createEmbed(
                `Vote Status for ${playerName}`,
                null,
                COLORS.PRIMARY
            );

            let readyCount = 0;
            let totalSites = voteData.sites.length;

            for (const site of voteData.sites) {
                let statusText;
                if (site.readyNow) {
                    readyCount++;
                    statusText = '✅ **Ready to vote!**';
                    if (site.voteUrl) {
                        statusText += `\n[Vote now](${site.voteUrl})`;
                    }
                } else {
                    // Use Discord timestamp formatting for dynamic countdown
                    const epochSec = site.nextVoteEpoch;
                    statusText = `⏳ Ready <t:${epochSec}:R>\n` +
                                 `(${formatDuration(site.remainingSeconds)} remaining)`;
                    if (site.voteUrl) {
                        statusText += `\n[Vote link](${site.voteUrl})`;
                    }
                }

                embed.addFields({
                    name: site.siteName,
                    value: statusText,
                    inline: true,
                });
            }

            // Summary line
            const summaryText = readyCount === totalSites
                ? `All ${totalSites} sites ready to vote!`
                : `${readyCount}/${totalSites} sites ready`;
            embed.setDescription(summaryText);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[votenext] Vote query failed:', err.message, err.status ? `(HTTP ${err.status})` : '', err.data || '');
            await interaction.editReply({
                embeds: [errorEmbed('Failed to fetch vote data. The Minecraft server may be offline.')],
            });
        }
    },
};
