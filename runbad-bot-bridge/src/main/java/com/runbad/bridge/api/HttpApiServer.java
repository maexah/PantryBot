package com.runbad.bridge.api;

import com.runbad.bridge.RunbadBotBridge;
import com.runbad.bridge.handlers.HealthHandler;
import com.runbad.bridge.handlers.LinkResolveHandler;
import com.runbad.bridge.handlers.PlaceholderEvalHandler;
import com.runbad.bridge.handlers.VoteNextHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class HttpApiServer {

    private final RunbadBotBridge plugin;
    private final String host;
    private final int port;
    private final String token;
    private HttpServer server;
    private boolean running = false;

    public HttpApiServer(RunbadBotBridge plugin, String host, int port, String token) {
        this.plugin = plugin;
        this.host = host;
        this.port = port;
        this.token = token;
    }

    public void start() throws IOException {
        InetSocketAddress address = new InetSocketAddress(host, port);
        server = HttpServer.create(address, 0);

        // Use a small thread pool - this is localhost-only, low traffic
        server.setExecutor(Executors.newFixedThreadPool(4));

        // Rate limiter shared across all endpoints
        RateLimiter rateLimiter = new RateLimiter(
            plugin.getConfig().getInt("rate-limit.max-per-minute", 60),
            plugin.getConfig().getInt("rate-limit.max-per-second", 10)
        );

        boolean logRequests = plugin.getConfig().getBoolean("logging.log-requests", true);

        // Register endpoints
        server.createContext("/health", new HealthHandler(plugin));
        server.createContext("/v1/link/resolve", new LinkResolveHandler(plugin, token, rateLimiter, logRequests));
        server.createContext("/v1/vote/next", new VoteNextHandler(plugin, token, rateLimiter, logRequests));
        server.createContext("/v1/placeholders/eval", new PlaceholderEvalHandler(plugin, token, rateLimiter, logRequests));

        server.start();
        running = true;
    }

    public void stop() {
        if (server != null) {
            server.stop(2); // 2 second grace period
            running = false;
        }
    }

    public boolean isRunning() {
        return running;
    }
}
