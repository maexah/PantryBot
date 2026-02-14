const WATCHED_ROLES = [
    '1468415501611831408', // Rankup Ping
    '1472024933466112122', // Pop Off
];

const ROLE_MENTION_REGEX = /<@&(\d+)>/g;

/**
 * Registers the role-mention echo listener on the given client.
 * When a non-bot message mentions one or both watched roles,
 * the bot replies with the same role mention(s).
 */
function register(client) {
    console.log('[RoleMentionEcho] Listener registered.');

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // Parse role mentions directly from message content
        const matches = [...message.content.matchAll(ROLE_MENTION_REGEX)];
        const mentionedIds = matches.map((m) => m[1]);

        console.log(`[RoleMentionEcho] Message from ${message.author.tag}: content role mentions = [${mentionedIds.join(', ')}]`);

        const matched = mentionedIds.filter((id) => WATCHED_ROLES.includes(id));
        if (matched.length === 0) return;

        // Deduplicate and maintain consistent order (Rankup Ping first, Pop Off second)
        const unique = [...new Set(matched)];
        const ordered = WATCHED_ROLES.filter((id) => unique.includes(id));

        const reply = ordered.map((id) => `<@&${id}>`).join(' ');

        console.log(`[RoleMentionEcho] Replying with: ${reply}`);

        try {
            await message.reply({ content: reply, allowedMentions: { roles: ordered } });
        } catch (err) {
            console.error('[RoleMentionEcho] Failed to reply:', err.message);
        }
    });
}

module.exports = { register };
