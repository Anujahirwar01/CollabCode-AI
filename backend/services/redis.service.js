// redisClient.js
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  // The 'tls' object is now correctly removed/commented out.
  // Make sure the closing brace for the Redis constructor is present and uncommented.
}); // <-- This closing brace and parenthesis MUST NOT be commented out.

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export default redisClient;