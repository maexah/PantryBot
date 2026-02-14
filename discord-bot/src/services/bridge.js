/**
 * Bridge API client for communicating with RunbadBotBridge Paper plugin.
 */

const BRIDGE_URL = (process.env.BRIDGE_URL || 'http://127.0.0.1:9585').trim().replace(/\/+$/, '');
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;

const DEFAULT_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 2; // retry up to 2 times on connection errors
const RETRY_DELAY_MS = 500;

/**
 * Extract a human-readable error message from a fetch error,
 * including the underlying cause (ECONNREFUSED, ETIMEDOUT, etc).
 */
function describeFetchError(err) {
    const parts = [err.message];
    if (err.cause) {
        const cause = err.cause;
        parts.push(cause.code || cause.message || String(cause));
    }
    return parts.join(' — ');
}

/**
 * Check whether an error is a transient connection failure worth retrying.
 */
function isRetryable(err) {
    const cause = err.cause;
    if (!cause) return false;
    const code = cause.code || '';
    return code === 'ECONNREFUSED' || code === 'ECONNRESET' ||
           code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ETIMEDOUT' ||
           cause.name === 'TimeoutError';
}

/**
 * Make an authenticated request to the bridge API.
 */
async function bridgeRequest(method, path, { query, body, timeout } = {}) {
    let url = `${BRIDGE_URL}${path}`;

    if (query) {
        const params = new URLSearchParams(query);
        url += `?${params.toString()}`;
    }

    const headers = {
        'Authorization': `Bearer ${BRIDGE_TOKEN}`,
    };

    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const options = {
                method,
                headers,
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
        } catch (err) {
            lastError = err;
            // Only retry on transient connection errors, not on HTTP-level errors
            if (err.status || !isRetryable(err) || attempt >= MAX_RETRIES) {
                break;
            }
            const delay = RETRY_DELAY_MS * (attempt + 1);
            console.warn(`[bridge] ${method} ${path} failed (${describeFetchError(err)}), retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // Enrich the error with diagnostic info before re-throwing
    if (lastError && !lastError.status) {
        const enriched = new Error(`Bridge request ${method} ${path} failed: ${describeFetchError(lastError)}`);
        enriched.cause = lastError.cause || lastError;
        enriched.bridgeUrl = BRIDGE_URL;
        throw enriched;
    }
    throw lastError;
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
