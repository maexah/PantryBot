package com.runbad.bridge.integrations;

import com.runbad.bridge.RunbadBotBridge;
import com.bencodez.votingplugin.VotingPluginMain;
import com.bencodez.votingplugin.objects.VoteSite;
import com.bencodez.votingplugin.users.VotingPluginUser;
import org.bukkit.Bukkit;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class VotePluginIntegration {

    private final RunbadBotBridge plugin;
    private final boolean available;

    // Simple TTL cache
    private final Map<String, CachedVoteData> voteCache = new ConcurrentHashMap<>();

    public VotePluginIntegration(RunbadBotBridge plugin) {
        this.plugin = plugin;
        this.available = Bukkit.getPluginManager().isPluginEnabled("VotingPlugin");
        if (available) {
            plugin.getLogger().info("VotingPlugin integration initialized.");
        } else {
            plugin.getLogger().warning("VotingPlugin not found - vote data will be unavailable.");
        }
    }

    public boolean isAvailable() {
        return available;
    }

    /**
     * Get vote cooldown data for all sites for a given player UUID.
     */
    public List<VoteSiteStatus> getVoteStatus(String uuidStr) {
        if (!available) {
            return Collections.emptyList();
        }

        // Check cache
        long cacheTtl = plugin.getConfig().getLong("cache.vote-ttl", 15) * 1000L;
        CachedVoteData cached = voteCache.get(uuidStr);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp) < cacheTtl) {
            return cached.data;
        }

        try {
            VotingPluginMain vpMain = VotingPluginMain.getPlugin();
            UUID uuid = UUID.fromString(uuidStr);
            VotingPluginUser vpUser = vpMain.getVotingPluginUserManager().getVotingPluginUser(uuid);

            List<VoteSiteStatus> results = new ArrayList<>();

            for (VoteSite site : vpMain.getVoteSites()) {
                String siteName = site.getDisplayName();
                if (siteName == null || siteName.isEmpty()) {
                    siteName = site.getKey();
                }

                // Get the time of last vote for this site
                long lastVoteTime = vpUser.getTime(site);
                int cooldownHours = (int) site.getVoteDelay(); // cooldown in hours

                long cooldownMs = cooldownHours * 3600L * 1000L;
                long nextVoteMs = lastVoteTime + cooldownMs;
                long now = System.currentTimeMillis();

                boolean readyNow;
                long nextVoteEpoch;
                long remainingSeconds;

                if (lastVoteTime <= 0 || now >= nextVoteMs) {
                    // Never voted or cooldown expired
                    readyNow = true;
                    nextVoteEpoch = 0;
                    remainingSeconds = 0;
                } else {
                    readyNow = false;
                    nextVoteEpoch = nextVoteMs / 1000;
                    remainingSeconds = (nextVoteMs - now) / 1000;
                }

                String nextVoteISO = readyNow ? null :
                    Instant.ofEpochMilli(nextVoteMs).toString();

                String voteUrl = site.getVoteURL();

                results.add(new VoteSiteStatus(
                    siteName, readyNow, nextVoteEpoch, nextVoteISO,
                    remainingSeconds, voteUrl
                ));
            }

            voteCache.put(uuidStr, new CachedVoteData(results));
            return results;
        } catch (Exception e) {
            plugin.getLogger().warning("Error getting vote status for " + uuidStr + ": " + e.getMessage());
            return Collections.emptyList();
        }
    }

    public void clearCache() {
        voteCache.clear();
    }

    public static class VoteSiteStatus {
        public final String siteName;
        public final boolean readyNow;
        public final long nextVoteEpoch;
        public final String nextVoteISO;
        public final long remainingSeconds;
        public final String voteUrl;

        public VoteSiteStatus(String siteName, boolean readyNow, long nextVoteEpoch,
                              String nextVoteISO, long remainingSeconds, String voteUrl) {
            this.siteName = siteName;
            this.readyNow = readyNow;
            this.nextVoteEpoch = nextVoteEpoch;
            this.nextVoteISO = nextVoteISO;
            this.remainingSeconds = remainingSeconds;
            this.voteUrl = voteUrl;
        }
    }

    private static class CachedVoteData {
        final List<VoteSiteStatus> data;
        final long timestamp;

        CachedVoteData(List<VoteSiteStatus> data) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }
    }
}
