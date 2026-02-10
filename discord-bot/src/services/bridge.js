/**
 * Bridge API client for communicating with RunbadBotBridge Paper plugin.
 */

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://127.0.0.1:9585';
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;

const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Make an authenticated request to the bridge API.
 */
async function bridgeRequest(method, path, { query, body, timeout } = {}) {
    let url = `${BRIDGE_URL}${path}`;

    if (query) {
        const params = new URLSearchParams(query);
        url += `?${params.toString()}`;
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${BRIDGE_TOKEN}`,
            'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(timeout || DEFAULT_TIMEOUT),
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        const err = new Error(data.message || `Bridge returned ${response.status}`);
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return data;
}

/**
 * Check bridge health.
 */
async function checkHealth() {
    // Health endpoint doesn't need auth
    const url = `${BRIDGE_URL}/health`;
    const response = await fetch(url, {
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    });
    return response.json();
}

/**
 * Resolve Discord user ID to linked Minecraft account.
 * @param {string} discordId
 * @returns {{ linked: boolean, uuid: string|null, name: string|null }}
 */
async function resolveLink(discordId) {
    return bridgeRequest('GET', '/v1/link/resolve', {
        query: { discord_id: discordId },
    });
}

/**
 * Get vote cooldown data for a player.
 * @param {string} uuid - Minecraft player UUID
 * @returns {{ uuid: string, sites: Array, queriedAt: number }}
 */
async function getVoteNext(uuid) {
    return bridgeRequest('GET', '/v1/vote/next', {
        query: { uuid },
    });
}

/**
 * Evaluate PlaceholderAPI placeholders for a player.
 * @param {string} uuid - Minecraft player UUID
 * @param {string[]} placeholders - Array of placeholder strings
 * @returns {{ uuid: string, values: Object }}
 */
async function evalPlaceholders(uuid, placeholders) {
    return bridgeRequest('POST', '/v1/placeholders/eval', {
        body: { uuid, placeholders },
    });
}

module.exports = {
    checkHealth,
    resolveLink,
    getVoteNext,
    evalPlaceholders,
};
