package com.runbad.bridge;

import com.runbad.bridge.api.HttpApiServer;
import com.runbad.bridge.integrations.DiscordSrvIntegration;
import com.runbad.bridge.integrations.PlaceholderApiIntegration;
import com.runbad.bridge.integrations.VotePluginIntegration;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.logging.Level;

public class RunbadBotBridge extends JavaPlugin {

    private HttpApiServer apiServer;
    private DiscordSrvIntegration discordSrv;
    private VotePluginIntegration votePlugin;
    private PlaceholderApiIntegration placeholderApi;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        // Initialize integrations
        discordSrv = new DiscordSrvIntegration(this);
        votePlugin = new VotePluginIntegration(this);
        placeholderApi = new PlaceholderApiIntegration(this);

        // Start HTTP API server
        try {
            String host = getConfig().getString("api.host", "127.0.0.1");
            int port = getConfig().getInt("api.port", 9585);
            String token = getConfig().getString("api.token", "CHANGE_ME_TO_A_RANDOM_SECRET");

            if ("CHANGE_ME_TO_A_RANDOM_SECRET".equals(token)) {
                getLogger().warning("=================================================");
                getLogger().warning("  WARNING: Using default API token!");
                getLogger().warning("  Change 'api.token' in config.yml immediately!");
                getLogger().warning("=================================================");
            }

            apiServer = new HttpApiServer(this, host, port, token);
            apiServer.start();

            getLogger().info("RunbadBotBridge API started on " + host + ":" + port);

            // Log container IPs so operators can configure BRIDGE_URL on split-server setups
            try {
                for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                    for (InetAddress addr : Collections.list(ni.getInetAddresses())) {
                        if (!addr.isLoopbackAddress() && addr.getAddress().length == 4) {
                            getLogger().info("Container IP: " + addr.getHostAddress() + " (interface " + ni.getName() + ") → use http://" + addr.getHostAddress() + ":" + port + " as BRIDGE_URL");
                        }
                    }
                }
            } catch (Exception ignored) { }
        } catch (Exception e) {
            getLogger().log(Level.SEVERE, "Failed to start HTTP API server", e);
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        getLogger().info("RunbadBotBridge v" + getDescription().getVersion() + " enabled!");
        getLogger().info("Integrations: DiscordSRV=" + discordSrv.isAvailable()
                + " VotingPlugin=" + votePlugin.isAvailable()
                + " PlaceholderAPI=" + placeholderApi.isAvailable());
    }

    @Override
    public void onDisable() {
        if (apiServer != null) {
            apiServer.stop();
            getLogger().info("HTTP API server stopped.");
        }
        getLogger().info("RunbadBotBridge disabled.");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if ("bridgestatus".equalsIgnoreCase(command.getName())) {
            sender.sendMessage("§6[RunbadBotBridge] §fStatus:");
            sender.sendMessage("§7  API Server: §a" + (apiServer != null && apiServer.isRunning() ? "Running" : "Stopped"));
            sender.sendMessage("§7  Bind: §f" + getConfig().getString("api.host") + ":" + getConfig().getInt("api.port"));
            sender.sendMessage("§7  DiscordSRV: " + (discordSrv.isAvailable() ? "§aAvailable" : "§cUnavailable"));
            sender.sendMessage("§7  VotingPlugin: " + (votePlugin.isAvailable() ? "§aAvailable" : "§cUnavailable"));
            sender.sendMessage("§7  PlaceholderAPI: " + (placeholderApi.isAvailable() ? "§aAvailable" : "§cUnavailable"));
            return true;
        }
        return false;
    }

    public DiscordSrvIntegration getDiscordSrv() {
        return discordSrv;
    }

    public VotePluginIntegration getVotePlugin() {
        return votePlugin;
    }

    public PlaceholderApiIntegration getPlaceholderApi() {
        return placeholderApi;
    }
}
