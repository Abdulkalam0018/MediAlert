import { createClient } from "redis";

let redisClient = null;

export const initRedis = async () => {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        console.log("⚠️ REDIS_URL not provided. Redis caching is disabled.");
        return null;
    }

    redisClient = createClient({
        url: redisUrl
    });

    redisClient.on("error", (err) => console.error("❌ Redis Client Error:", err));
    redisClient.on("connect", () => console.log("✅ Connected to Redis cache"));

    try {
        await redisClient.connect();
    } catch (error) {
        console.error("❌ Failed to connect to Redis, falling back to direct DB queries:", error.message);
        redisClient = null; // graceful fallback
    }

    return redisClient;
};

export const getRedisClient = () => redisClient;
