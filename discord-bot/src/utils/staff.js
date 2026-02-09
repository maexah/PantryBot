/**
 * Staff role checking utility.
 */

/**
 * Check if a guild member has any of the configured staff roles.
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isStaff(member) {
    const staffRoleIds = (process.env.STAFF_ROLE_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    if (staffRoleIds.length === 0) return false;
    if (!member || !member.roles) return false;

    return staffRoleIds.some(roleId => member.roles.cache.has(roleId));
}

module.exports = { isStaff };
