/**
 * MySQL database service for audit logging and optional caching.
 */

let pool = null;

async function initDatabase() {
    const mysql = require('mysql2/promise');

    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME || 'runbadbot';

    if (!dbUser || !dbPassword) {
        throw new Error('DB_USER and DB_PASSWORD are required');
    }

    pool = mysql.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000,
    });

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    // Create tables
    await createTables();
}

async function createTables() {
    if (!pool) return;

    // Audit log table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS command_audit (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            discord_user_id VARCHAR(20) NOT NULL,
            command_name VARCHAR(64) NOT NULL,
            success BOOLEAN NOT NULL DEFAULT TRUE,
            error_message TEXT NULL,
            target_uuid VARCHAR(36) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (discord_user_id),
            INDEX idx_command (command_name),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Link cache table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS link_cache (
            discord_user_id VARCHAR(20) PRIMARY KEY,
            linked BOOLEAN NOT NULL DEFAULT FALSE,
            mc_uuid VARCHAR(36) NULL,
            mc_name VARCHAR(32) NULL,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_cached_at (cached_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Vote cache table (optional short-lived cache)
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS vote_cache (
            mc_uuid VARCHAR(36) PRIMARY KEY,
            vote_data JSON NOT NULL,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_cached_at (cached_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

/**
 * Get database pool (may be null if DB not configured).
 */
function getPool() {
    return pool;
}

/**
 * Check if database is available.
 */
function isAvailable() {
    return pool !== null;
}

module.exports = {
    initDatabase,
    getPool,
    isAvailable,
};
