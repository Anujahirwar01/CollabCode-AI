// redisClient.js
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient = null;

// Check if Redis configuration is available
if (process.env.REDIS_HOST && process.env.REDIS_PORT && process.env.REDIS_PASSWORD) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      retryDelayOnCritical: 10000,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
      // Don't let Redis errors crash the application
    });

    redisClient.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    // Test the connection
    redisClient.ping().catch(err => {
      console.error('❌ Redis ping failed:', err.message);
      console.log('🔄 Application will continue without Redis caching');
    });

  } catch (error) {
    console.error('❌ Failed to create Redis client:', error.message);
    console.log('🔄 Application will continue without Redis caching');
    redisClient = null;
  }
} else {
  console.log('⚠️ Redis configuration not found. Running without Redis caching.');
}

// Export a wrapper that handles null redisClient gracefully
export default {
  get: async (key) => {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  },

  set: async (key, value, options = {}) => {
    if (!redisClient) return false;
    try {
      if (options.ex) {
        return await redisClient.setex(key, options.ex, value);
      }
      return await redisClient.set(key, value);
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  },

  del: async (key) => {
    if (!redisClient) return false;
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  },

  exists: async (key) => {
    if (!redisClient) return false;
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  },

  isConnected: () => {
    return redisClient && redisClient.status === 'ready';
  }
};