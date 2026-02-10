package com.runbad.bridge.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.runbad.bridge.RunbadBotBridge;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Base handler with auth, rate limiting, and JSON helpers.
 */
public abstract class BaseHandler implements HttpHandler {

    protected static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();

    protected final RunbadBotBridge plugin;
    protected final String expectedToken;
    protected final RateLimiter rateLimiter;
    protected final boolean logRequests;

    public BaseHandler(RunbadBotBridge plugin, String expectedToken, RateLimiter rateLimiter, boolean logRequests) {
        this.plugin = plugin;
        this.expectedToken = expectedToken;
        this.rateLimiter = rateLimiter;
        this.logRequests = logRequests;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String ip = exchange.getRemoteAddress().getAddress().getHostAddress();
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        if (logRequests) {
            plugin.getLogger().info("[API] " + method + " " + path + " from " + ip);
        }

        // Rate limit check
        if (!rateLimiter.tryAcquire(ip)) {
            sendError(exchange, 429, "Rate limit exceeded");
            return;
        }

        // Auth check
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.equals("Bearer " + expectedToken)) {
            sendError(exchange, 401, "Unauthorized");
            return;
        }

        // Method check
        String requiredMethod = getRequiredMethod();
        if (requiredMethod != null && !method.equalsIgnoreCase(requiredMethod)) {
            sendError(exchange, 405, "Method not allowed");
            return;
        }

        try {
            handleAuthenticated(exchange);
        } catch (IllegalArgumentException e) {
            sendError(exchange, 400, e.getMessage());
        } catch (Exception e) {
            plugin.getLogger().warning("[API] Error handling " + path + ": " + e.getMessage());
            sendError(exchange, 500, "Internal server error");
        }
    }

    protected abstract void handleAuthenticated(HttpExchange exchange) throws IOException;

    protected String getRequiredMethod() {
        return "GET";
    }

    protected String getQueryParam(HttpExchange exchange, String key) {
        String query = exchange.getRequestURI().getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && kv[0].equals(key)) {
                return kv[1];
            }
        }
        return null;
    }

    protected String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            int totalChars = 0;
            while ((line = reader.readLine()) != null) {
                totalChars += line.length();
                if (totalChars > 10_000) {
                    throw new IllegalArgumentException("Request body too large");
                }
                sb.append(line);
            }
            return sb.toString();
        }
    }

    protected void sendJson(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String json = GSON.toJson(data);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    protected void sendError(HttpExchange exchange, int statusCode, String message) throws IOException {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("error", true);
        error.put("status", statusCode);
        error.put("message", message);
        sendJson(exchange, statusCode, error);
    }

    /**
     * Validate a UUID string format.
     */
    protected boolean isValidUuid(String uuid) {
        if (uuid == null) return false;
        return uuid.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    /**
     * Validate a Discord snowflake ID format.
     */
    protected boolean isValidDiscordId(String id) {
        if (id == null) return false;
        return id.matches("^\\d{17,20}$");
    }
}
