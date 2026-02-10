/**
 * Audit logging service.
 * Logs command usage to MySQL for accountability.
 */

const { getPool, isAvailable } = require('./database');

/**
 * Log a command execution.
 * @param {Object} entry
 * @param {string} entry.discordUserId
 * @param {string} entry.commandName
 * @param {boolean} entry.success
 * @param {string} [entry.error]
 * @param {string} [entry.targetUuid] - For staff override commands
 */
async function logAudit(entry) {
    if (!isAvailable()) return;

    try {
        const pool = getPool();
        await pool.execute(
            `INSERT INTO command_audit (discord_user_id, command_name, success, error_message, target_uuid)
             VALUES (?, ?, ?, ?, ?)`,
            [
                entry.discordUserId,
                entry.commandName,
                entry.success,
                entry.error || null,
                entry.targetUuid || null,
            ]
        );
    } catch (err) {
        // Don't let audit failures break the bot
        console.error('[Audit] Failed to log:', err.message);
    }
}

module.exports = { logAudit };
