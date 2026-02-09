package com.runbad.bridge.integrations;

import com.runbad.bridge.RunbadBotBridge;
import github.scarsz.discordsrv.DiscordSRV;
import github.scarsz.discordsrv.util.DiscordUtil;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class DiscordSrvIntegration {

    private final RunbadBotBridge plugin;
    private final boolean available;

    // Simple TTL cache for link lookups
    private final Map<String, CachedLink> linkCache = new ConcurrentHashMap<>();

    public DiscordSrvIntegration(RunbadBotBridge plugin) {
        this.plugin = plugin;
        this.available = Bukkit.getPluginManager().isPluginEnabled("DiscordSRV");
        if (available) {
            plugin.getLogger().info("DiscordSRV integration initialized.");
        } else {
            plugin.getLogger().warning("DiscordSRV not found - link resolution will be unavailable.");
        }
    }

    public boolean isAvailable() {
        return available;
    }

    /**
     * Resolve a Discord user ID to a linked Minecraft UUID.
     * Returns null if not linked or DiscordSRV unavailable.
     */
    public LinkResult resolve(String discordId) {
        if (!available) {
            return null;
        }

        // Check cache
        long cacheTtl = plugin.getConfig().getLong("cache.link-ttl", 60) * 1000L;
        CachedLink cached = linkCache.get(discordId);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < cacheTtl) {
            return cached.result;
        }

        try {
            // DiscordSRV API: get UUID from Discord ID
            UUID uuid = DiscordSRV.getPlugin().getAccountLinkManager().getUuid(discordId);
            if (uuid == null) {
                LinkResult result = new LinkResult(false, null, null);
                linkCache.put(discordId, new CachedLink(result));
                return result;
            }

            // Resolve player name
            OfflinePlayer player = Bukkit.getOfflinePlayer(uuid);
            String name = player.getName();
            if (name == null) {
                name = uuid.toString(); // fallback
            }

            LinkResult result = new LinkResult(true, uuid.toString(), name);
            linkCache.put(discordId, new CachedLink(result));
            return result;
        } catch (Exception e) {
            plugin.getLogger().warning("Error resolving Discord ID " + discordId + ": " + e.getMessage());
            return null;
        }
    }

    public void clearCache() {
        linkCache.clear();
    }

    public static class LinkResult {
        public final boolean linked;
        public final String uuid;
        public final String name;

        public LinkResult(boolean linked, String uuid, String name) {
            this.linked = linked;
            this.uuid = uuid;
            this.name = name;
        }
    }

    private static class CachedLink {
        final LinkResult result;
        final long timestamp;

        CachedLink(LinkResult result) {
            this.result = result;
            this.timestamp = System.currentTimeMillis();
        }
    }
}
