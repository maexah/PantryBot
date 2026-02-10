package com.runbad.bridge.integrations;

import com.runbad.bridge.RunbadBotBridge;
import me.clip.placeholderapi.PlaceholderAPI;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

import java.util.*;
import java.util.regex.Pattern;

public class PlaceholderApiIntegration {

    private final RunbadBotBridge plugin;
    private final boolean available;

    // Allowed placeholder pattern: must be %word_word_word% format
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("^%[a-zA-Z0-9_]+%$");

    // Blocked placeholder prefixes (security: no command execution, etc.)
    private static final Set<String> BLOCKED_PREFIXES = Set.of(
        "%server_command_", "%javascript_", "%math_", "%pinger_"
    );

    public PlaceholderApiIntegration(RunbadBotBridge plugin) {
        this.plugin = plugin;
        this.available = Bukkit.getPluginManager().isPluginEnabled("PlaceholderAPI");
        if (available) {
            plugin.getLogger().info("PlaceholderAPI integration initialized.");
        } else {
            plugin.getLogger().info("PlaceholderAPI not found - placeholder evaluation will be unavailable.");
        }
    }

    public boolean isAvailable() {
        return available;
    }

    /**
     * Evaluate a list of placeholders for a given player UUID.
     * Returns a map of placeholder -> resolved value.
     */
    public Map<String, String> evaluate(String uuidStr, List<String> placeholders) {
        Map<String, String> results = new LinkedHashMap<>();

        if (!available) {
            for (String ph : placeholders) {
                results.put(ph, "PlaceholderAPI not available");
            }
            return results;
        }

        if (placeholders.size() > 20) {
            // Hard limit on number of placeholders per request
            throw new IllegalArgumentException("Too many placeholders (max 20)");
        }

        try {
            UUID uuid = UUID.fromString(uuidStr);
            OfflinePlayer player = Bukkit.getOfflinePlayer(uuid);

            for (String placeholder : placeholders) {
                // Validate format
                if (!PLACEHOLDER_PATTERN.matcher(placeholder).matches()) {
                    results.put(placeholder, "INVALID_FORMAT");
                    continue;
                }

                // Check blocklist
                String lower = placeholder.toLowerCase();
                boolean blocked = false;
                for (String prefix : BLOCKED_PREFIXES) {
                    if (lower.startsWith(prefix)) {
                        blocked = true;
                        break;
                    }
                }
                if (blocked) {
                    results.put(placeholder, "BLOCKED");
                    continue;
                }

                // Evaluate
                String result = PlaceholderAPI.setPlaceholders(player, placeholder);
                results.put(placeholder, result);
            }
        } catch (IllegalArgumentException e) {
            throw e; // Re-throw validation errors
        } catch (Exception e) {
            plugin.getLogger().warning("Error evaluating placeholders for " + uuidStr + ": " + e.getMessage());
            for (String ph : placeholders) {
                results.putIfAbsent(ph, "ERROR");
            }
        }

        return results;
    }
}
