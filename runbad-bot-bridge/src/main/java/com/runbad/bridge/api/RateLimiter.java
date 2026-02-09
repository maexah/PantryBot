package com.runbad.bridge.api;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple token-bucket-style rate limiter per IP address.
 */
public class RateLimiter {

    private final int maxPerMinute;
    private final int maxPerSecond;

    private final Map<String, BucketEntry> minuteBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> secondBuckets = new ConcurrentHashMap<>();

    public RateLimiter(int maxPerMinute, int maxPerSecond) {
        this.maxPerMinute = maxPerMinute;
        this.maxPerSecond = maxPerSecond;
    }

    /**
     * Check if the given IP is allowed to make a request.
     * Returns true if allowed, false if rate limited.
     */
    public boolean tryAcquire(String ip) {
        long now = System.currentTimeMillis();

        // Check per-second limit
        BucketEntry secEntry = secondBuckets.compute(ip, (k, v) -> {
            if (v == null || (now - v.windowStart) >= 1000) {
                return new BucketEntry(now, 1);
            }
            v.count.incrementAndGet();
            return v;
        });
        if (secEntry.count.get() > maxPerSecond) {
            return false;
        }

        // Check per-minute limit
        BucketEntry minEntry = minuteBuckets.compute(ip, (k, v) -> {
            if (v == null || (now - v.windowStart) >= 60000) {
                return new BucketEntry(now, 1);
            }
            v.count.incrementAndGet();
            return v;
        });
        return minEntry.count.get() <= maxPerMinute;
    }

    private static class BucketEntry {
        final long windowStart;
        final AtomicInteger count;

        BucketEntry(long windowStart, int initialCount) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(initialCount);
        }
    }
}
