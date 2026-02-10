package com.runbad.bridge.handlers;

import com.runbad.bridge.RunbadBotBridge;
import com.runbad.bridge.api.BaseHandler;
import com.runbad.bridge.api.RateLimiter;
import com.runbad.bridge.integrations.DiscordSrvIntegration;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GET /v1/link/resolve?discord_id=123456789
 * Returns linked MC account info for a Discord user.
 */
public class LinkResolveHandler extends BaseHandler {

    public LinkResolveHandler(RunbadBotBridge plugin, String token, RateLimiter rateLimiter, boolean logRequests) {
        super(plugin, token, rateLimiter, logRequests);
    }

    @Override
    protected void handleAuthenticated(HttpExchange exchange) throws IOException {
        String discordId = getQueryParam(exchange, "discord_id");

        if (discordId == null || discordId.isEmpty()) {
            sendError(exchange, 400, "Missing required parameter: discord_id");
            return;
        }

        if (!isValidDiscordId(discordId)) {
            sendError(exchange, 400, "Invalid discord_id format");
            return;
        }

        if (!plugin.getDiscordSrv().isAvailable()) {
            sendError(exchange, 503, "DiscordSRV integration unavailable");
            return;
        }

        DiscordSrvIntegration.LinkResult result = plugin.getDiscordSrv().resolve(discordId);

        Map<String, Object> response = new LinkedHashMap<>();
        if (result == null) {
            response.put("linked", false);
            response.put("uuid", null);
            response.put("name", null);
            response.put("error", "Failed to query DiscordSRV");
        } else {
            response.put("linked", result.linked);
            response.put("uuid", result.uuid);
            response.put("name", result.name);
        }

        sendJson(exchange, 200, response);
    }
}
