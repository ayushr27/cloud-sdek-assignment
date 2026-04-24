import IORedis from 'ioredis';
import { config } from '../config';

// Simple in-memory cache fallback when Redis is not available
const memCache = new Map<string, { data: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.data;
}

function memSet(key: string, ttlSeconds: number, value: string) {
  memCache.set(key, { data: value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDel(key: string) { memCache.delete(key); }

// Proxy object that works regardless of whether Redis is up
export type CacheClient = {
  get: (key: string) => Promise<string | null>;
  getBuffer: (key: string) => Promise<Buffer | null>;
  setex: (key: string, ttl: number, value: string | Buffer) => Promise<void>;
  del: (key: string) => Promise<void>;
  isRedisAvailable: () => boolean;
};

let redis: IORedis | null = null;
let redisUp = false;

// Helper: wrap a Redis call with a timeout to prevent hanging
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`⚠️  Redis operation timed out after ${ms}ms — falling back to memory cache`);
      redisUp = false;
      resolve(fallback);
    }, ms)),
  ]);
}

const REDIS_TIMEOUT_MS = 3000; // 3 second timeout for all Redis ops

function tryConnectRedis(): void {
  try {
    redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
      reconnectOnError: () => false,
      tls: config.redisUrl.startsWith('rediss://') ? {} : undefined,
    });

    redis.on('connect', () => { redisUp = true; console.log('✅ Redis cache connected'); });
    redis.on('error', (err) => { 
      redisUp = false; 
      console.warn('⚠️  Redis cache error:', err.message);
    });
    redis.on('close', () => { redisUp = false; });

    redis.connect().catch(() => {
      redisUp = false;
      console.warn('⚠️  Redis unavailable — using in-memory cache fallback');
    });
  } catch {
    redisUp = false;
  }
}

tryConnectRedis();

export const cache: CacheClient = {
  isRedisAvailable: () => redisUp,

  async get(key) {
    if (redisUp && redis) {
      try {
        return await withTimeout(redis.get(key), REDIS_TIMEOUT_MS, null);
      } catch { redisUp = false; }
    }
    return memGet(key);
  },

  async getBuffer(key) {
    if (redisUp && redis) {
      try {
        return await withTimeout(redis.getBuffer(key), REDIS_TIMEOUT_MS, null);
      } catch { redisUp = false; }
    }
    const v = memGet(key);
    return v ? Buffer.from(v, 'base64') : null;
  },

  async setex(key, ttl, value) {
    if (redisUp && redis) {
      try {
        if (Buffer.isBuffer(value)) {
          await withTimeout(redis.setex(key, ttl, value), REDIS_TIMEOUT_MS, undefined);
        } else {
          await withTimeout(redis.setex(key, ttl, value as string), REDIS_TIMEOUT_MS, undefined);
        }
        return;
      } catch { redisUp = false; }
    }
    const str = Buffer.isBuffer(value) ? value.toString('base64') : String(value);
    memSet(key, ttl, str);
  },

  async del(key) {
    if (redisUp && redis) {
      try {
        await withTimeout(redis.del(key).then(() => undefined), REDIS_TIMEOUT_MS, undefined);
        return;
      } catch { redisUp = false; }
    }
    memDel(key);
  },
};

// Also export the raw redis instance for BullMQ (will be null if Redis unavailable)
export const rawRedis = redis;
export { redisUp };
