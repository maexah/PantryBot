const WATCHED_ROLES = [
    '1468415501611831408', // Rankup Ping
    '1472024933466112122', // Pop Off
];

/**
 * Registers the role-mention echo listener on the given client.
 * When a non-bot message mentions one or both watched roles,
 * the bot replies with the same role mention(s).
 */
function register(client) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const mentionedIds = message.mentions.roles
            .filter((role) => WATCHED_ROLES.includes(role.id))
            .map((role) => role.id);

        if (mentionedIds.length === 0) return;

        // Deduplicate and maintain consistent order (Rankup Ping first, Pop Off second)
        const unique = [...new Set(mentionedIds)];
        const ordered = WATCHED_ROLES.filter((id) => unique.includes(id));

        const reply = ordered.map((id) => `<@&${id}>`).join(' ');

        try {
            await message.reply({ content: reply, allowedMentions: { roles: ordered } });
        } catch (err) {
            console.error('[RoleMentionEcho] Failed to reply:', err.message);
        }
    });
}

module.exports = { register };
