package com.runbad.bridge.handlers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.runbad.bridge.RunbadBotBridge;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health check endpoint - no auth required.
 * GET /health
 */
public class HealthHandler implements HttpHandler {

    private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();
    private final RunbadBotBridge plugin;

    public HealthHandler(RunbadBotBridge plugin) {
        this.plugin = plugin;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendJson(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("timestamp", Instant.now().toString());

        Map<String, Object> versions = new LinkedHashMap<>();
        versions.put("bridge", plugin.getDescription().getVersion());
        versions.put("server", plugin.getServer().getVersion());
        response.put("versions", versions);

        Map<String, Boolean> integrations = new LinkedHashMap<>();
        integrations.put("discordsrv", plugin.getDiscordSrv().isAvailable());
        integrations.put("votingplugin", plugin.getVotePlugin().isAvailable());
        integrations.put("placeholderapi", plugin.getPlaceholderApi().isAvailable());
        response.put("integrations", integrations);

        sendJson(exchange, 200, response);
    }

    private void sendJson(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String json = GSON.toJson(data);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
