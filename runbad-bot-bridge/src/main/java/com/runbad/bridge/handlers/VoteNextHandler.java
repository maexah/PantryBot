package com.runbad.bridge.handlers;

import com.runbad.bridge.RunbadBotBridge;
import com.runbad.bridge.api.BaseHandler;
import com.runbad.bridge.api.RateLimiter;
import com.runbad.bridge.integrations.VotePluginIntegration;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.util.*;

/**
 * GET /v1/vote/next?uuid=...
 * Returns per-site vote cooldown data for a player.
 */
public class VoteNextHandler extends BaseHandler {

    public VoteNextHandler(RunbadBotBridge plugin, String token, RateLimiter rateLimiter, boolean logRequests) {
        super(plugin, token, rateLimiter, logRequests);
    }

    @Override
    protected void handleAuthenticated(HttpExchange exchange) throws IOException {
        String uuid = getQueryParam(exchange, "uuid");

        if (uuid == null || uuid.isEmpty()) {
            sendError(exchange, 400, "Missing required parameter: uuid");
            return;
        }

        if (!isValidUuid(uuid)) {
            sendError(exchange, 400, "Invalid uuid format");
            return;
        }

        if (!plugin.getVotePlugin().isAvailable()) {
            sendError(exchange, 503, "VotingPlugin integration unavailable");
            return;
        }

        List<VotePluginIntegration.VoteSiteStatus> sites = plugin.getVotePlugin().getVoteStatus(uuid);

        List<Map<String, Object>> siteList = new ArrayList<>();
        for (VotePluginIntegration.VoteSiteStatus site : sites) {
            Map<String, Object> siteData = new LinkedHashMap<>();
            siteData.put("siteName", site.siteName);
            siteData.put("readyNow", site.readyNow);
            siteData.put("nextVoteEpoch", site.nextVoteEpoch);
            siteData.put("nextVoteISO", site.nextVoteISO);
            siteData.put("remainingSeconds", site.remainingSeconds);
            siteData.put("voteUrl", site.voteUrl);
            siteList.add(siteData);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("uuid", uuid);
        response.put("sites", siteList);
        response.put("queriedAt", System.currentTimeMillis() / 1000);

        sendJson(exchange, 200, response);
    }
}
