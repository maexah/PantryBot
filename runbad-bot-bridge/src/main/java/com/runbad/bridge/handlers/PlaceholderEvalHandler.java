package com.runbad.bridge.handlers;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.runbad.bridge.RunbadBotBridge;
import com.runbad.bridge.api.BaseHandler;
import com.runbad.bridge.api.RateLimiter;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.util.*;

/**
 * POST /v1/placeholders/eval
 * Body: { "uuid": "...", "placeholders": ["%vault_eco_balance%", ...] }
 * Returns: { "values": { "%vault_eco_balance%": "123.45", ... } }
 */
public class PlaceholderEvalHandler extends BaseHandler {

    public PlaceholderEvalHandler(RunbadBotBridge plugin, String token, RateLimiter rateLimiter, boolean logRequests) {
        super(plugin, token, rateLimiter, logRequests);
    }

    @Override
    protected String getRequiredMethod() {
        return "POST";
    }

    @Override
    protected void handleAuthenticated(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);

        JsonObject json;
        try {
            json = JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception e) {
            sendError(exchange, 400, "Invalid JSON body");
            return;
        }

        // Extract uuid
        if (!json.has("uuid") || json.get("uuid").isJsonNull()) {
            sendError(exchange, 400, "Missing required field: uuid");
            return;
        }
        String uuid = json.get("uuid").getAsString();
        if (!isValidUuid(uuid)) {
            sendError(exchange, 400, "Invalid uuid format");
            return;
        }

        // Extract placeholders
        if (!json.has("placeholders") || !json.get("placeholders").isJsonArray()) {
            sendError(exchange, 400, "Missing required field: placeholders (array)");
            return;
        }
        JsonArray phArray = json.getAsJsonArray("placeholders");
        if (phArray.size() == 0) {
            sendError(exchange, 400, "Placeholders array is empty");
            return;
        }
        if (phArray.size() > 20) {
            sendError(exchange, 400, "Too many placeholders (max 20)");
            return;
        }

        List<String> placeholders = new ArrayList<>();
        for (JsonElement el : phArray) {
            placeholders.add(el.getAsString());
        }

        if (!plugin.getPlaceholderApi().isAvailable()) {
            sendError(exchange, 503, "PlaceholderAPI integration unavailable");
            return;
        }

        Map<String, String> values = plugin.getPlaceholderApi().evaluate(uuid, placeholders);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("uuid", uuid);
        response.put("values", values);

        sendJson(exchange, 200, response);
    }
}
