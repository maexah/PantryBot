const WATCHED_ROLES = [
    '1468415501611831408', // Rankup Ping
    '1472024933466112122', // Pop Off
];

const ROLE_MENTION_REGEX = /<@&(\d+)>/g;

/**
 * Extracts all role mention IDs from a string.
 */
function extractRoleMentions(text) {
    if (!text) return [];
    return [...text.matchAll(ROLE_MENTION_REGEX)].map((m) => m[1]);
}

/**
 * Registers the role-mention echo listener on the given client.
 * When any message (except our own) mentions one or both watched roles
 * in its content or embeds, the bot replies with the same role mention(s).
 */
function register(client) {
    console.log('[RoleMentionEcho] Listener registered.');

    client.on('messageCreate', async (message) => {
        // Only ignore our own messages (prevent reply loops)
        if (message.author.id === message.client.user.id) return;

        // Collect role mentions from message content
        const mentionedIds = extractRoleMentions(message.content);

        // Also collect role mentions from embeds (description, field values, title, footer)
        for (const embed of message.embeds) {
            mentionedIds.push(...extractRoleMentions(embed.description));
            mentionedIds.push(...extractRoleMentions(embed.title));
            if (embed.footer) mentionedIds.push(...extractRoleMentions(embed.footer.text));
            for (const field of embed.fields) {
                mentionedIds.push(...extractRoleMentions(field.name));
                mentionedIds.push(...extractRoleMentions(field.value));
            }
        }

        console.log(`[RoleMentionEcho] Message from ${message.author.tag} (bot=${message.author.bot}): role mentions = [${mentionedIds.join(', ')}]`);

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
