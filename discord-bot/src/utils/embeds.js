/**
 * Shared embed builder utilities.
 */

const { EmbedBuilder } = require('discord.js');

const COLORS = {
    PRIMARY: 0x5865F2,   // Discord blurple
    SUCCESS: 0x57F287,   // Green
    WARNING: 0xFEE75C,   // Yellow
    ERROR: 0xED4245,     // Red
    INFO: 0x5865F2,      // Blurple
};

/**
 * Create a standard embed with Runbad branding.
 */
function createEmbed(title, description, color = COLORS.PRIMARY) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || null)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Runbad Bot' });
}

/**
 * Create an error embed.
 */
function errorEmbed(message) {
    return createEmbed('Error', message, COLORS.ERROR);
}

/**
 * Create a success embed.
 */
function successEmbed(title, description) {
    return createEmbed(title, description, COLORS.SUCCESS);
}

/**
 * Format seconds into a human-readable duration.
 */
function formatDuration(seconds) {
    if (seconds <= 0) return 'Ready now';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    if (parts.length === 0) parts.push('<1m');

    return parts.join(' ');
}

module.exports = {
    COLORS,
    createEmbed,
    errorEmbed,
    successEmbed,
    formatDuration,
};
